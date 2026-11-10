import { identifyCaller, getClientIp } from '../exam/auth.js';
import { applySecurityHeaders } from '../securityHeaders.js';
import { createBattleStorage } from './storage.js';
import { createBattleService, battleError } from './service.js';
import { awardBattleRewards } from './rewards.js';
import { REFILL_INTERVAL } from './config.js';

const storage = createBattleStorage();
const service = createBattleService(storage, { reward: awardBattleRewards });
const limits = new Map();
let stopRuntime;
let lastRewardTick = 0;

function rateLimit(key, max) {
  const time = Date.now();
  let item = limits.get(key);
  if (!item || item.until <= time) { item = { count: 0, until: time + 60000 }; limits.set(key, item); }
  if (++item.count > max) throw battleError('RATE_LIMIT', 'Too many requests. Try again shortly', 429);
  if (limits.size > 10000) for (const [id, value] of limits) if (value.until <= time) limits.delete(id);
}
export function startBattleRuntime() {
  if (stopRuntime) return stopRuntime;
  const refill = () => { try { service.init(); storage.refill(); } catch (e) { console.warn('[battle] Kho đề:', e.message); } };
  const tick = () => {
    // Deadline được kiểm tra cả khi request; tick này bảo đảm tự nộp lúc tất cả đã đóng tab.
    if (Date.now() - lastRewardTick < 1000) return;
    lastRewardTick = Date.now();
    service.tick().catch(e => console.warn('[battle] Trạng thái:', e.message));
  };
  const boot = setTimeout(refill, 0);
  const poolTimer = setInterval(refill, REFILL_INTERVAL);
  const roomTimer = setInterval(tick, 1000);
  boot.unref?.(); poolTimer.unref?.(); roomTimer.unref?.();
  stopRuntime = () => { clearTimeout(boot); clearInterval(poolTimer); clearInterval(roomTimer); stopRuntime = null; };
  return stopRuntime;
}
async function readBody(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 8192) throw battleError('BODY_TOO_LARGE', 'Request is too large', 413);
    chunks.push(chunk);
  }
  try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw battleError('INVALID_JSON', 'Invalid request body', 400); }
}
export async function battleMiddleware(req, res) {
  applySecurityHeaders(res, req);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    rateLimit(`ip:${getClientIp(req)}`, 1800);
    const caller = await identifyCaller(req);
    if (caller.isAnonymous) throw battleError('AUTH_REQUIRED', 'Sign in to enter the arena', 401);
    rateLimit(`user:${caller.userId}`, 240);
    const action = (req.url || '').split('?')[0].replace(/^\/api\/battle/, '').replace(/^\//, '');
    let room;
    if (req.method === 'GET' && action === 'state') room = service.state(caller.userId);
    else if (req.method === 'POST') {
      const body = await readBody(req);
      if (action === 'enter') {
        rateLimit(`enter:${caller.userId}`, 12);
        room = service.enter(caller.userId, body.mode, body.profile, body.code);
      } else if (action === 'leave') room = service.leave(caller.userId, body.roomId);
      else room = service.mutate(caller.userId, action, body);
    } else throw battleError('NOT_FOUND', 'Endpoint not found', 404);
    res.end(JSON.stringify({ ok: true, room }));
  } catch (error) {
    if (!error.status) console.error('[battle]', error.message);
    res.statusCode = error.status || 503;
    res.end(JSON.stringify({ ok: false, code: error.code || 'UNAVAILABLE',
      message: error.status ? error.message : 'Arena is temporarily unavailable. Please try again' }));
  }
}
