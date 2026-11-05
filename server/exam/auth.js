// ============================================================
//  Xác thực người gọi API gen đề
//   - Có Bearer token  → xác minh với Supabase, dùng user id thật
//   - Không có token    → coi là khách (chế độ demo của web vẫn chạy),
//     nhưng bị giới hạn chặt hơn theo IP
//  Không tin bất kỳ user id nào do client tự gửi lên.
// ============================================================
import { RATE_LIMIT } from './config.js';
import { loadRepoEnv } from '../envLoader.js';

loadRepoEnv();

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://vxqvjffssebnuxtslghp.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cXZqZmZzc2VibnV4dHNsZ2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MDk5NjgsImV4cCI6MjEwNzM4NTk2OH0.KZUQnisFgnoo_ZHUk7Wn9LfbLAzuzSztwYRLh1VHp6U';

/** Cache kết quả xác minh token 5 phút để không gọi Supabase mỗi request */
const tokenCache = new Map();
const TOKEN_TTL_MS = 5 * 60 * 1000;

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

/** Lấy IP thật sau proxy nginx/aaPanel */
export function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Xác minh token với Supabase Auth.
 * @returns {{userId: string, email: string} | null}
 */
async function verifyToken(token) {
  const cached = tokenCache.get(token);
  if (cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.user;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      tokenCache.set(token, { user: null, at: Date.now() });
      return null;
    }
    const data = await response.json();
    if (!data?.id) {
      tokenCache.set(token, { user: null, at: Date.now() });
      return null;
    }
    const user = { userId: data.id, email: data.email || '' };
    tokenCache.set(token, { user, at: Date.now() });

    if (tokenCache.size > 2000) {
      const cutoff = Date.now() - TOKEN_TTL_MS;
      for (const [key, value] of tokenCache) {
        if (value.at < cutoff) tokenCache.delete(key);
      }
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Xác định danh tính người gọi.
 * @returns {{userId: string, isAnonymous: boolean, ipLimit: boolean}}
 */
export async function identifyCaller(req) {
  const token = getBearerToken(req);
  if (token) {
    const verified = await verifyToken(token);
    if (verified) {
      return { userId: verified.userId, isAnonymous: false, ipLimit: false };
    }
  }
  // Khách / demo: định danh theo IP và bị giới hạn chặt hơn
  const ip = getClientIp(req);
  return { userId: `anon:${ip}`, isAnonymous: true, ipLimit: true };
}

// Chat exemptions use only the authenticated account's persisted profile.
// Never accept admin flags from request bodies or user-editable Auth metadata.
export async function identifyChatCaller(req) {
  const caller = await identifyCaller(req);
  if (caller.isAnonymous) return { ...caller, isAdmin: false };
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(caller.userId)}&select=is_admin`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${getBearerToken(req)}` },
      signal: AbortSignal.timeout(5000),
    });
    const profiles = response.ok ? await response.json() : null;
    return { ...caller, isAdmin: Array.isArray(profiles) && profiles.length === 1 && profiles[0].is_admin === true };
  } catch {
    return { ...caller, isAdmin: false };
  }
}

/** Giới hạn riêng cho khách chưa đăng nhập */
export const ANON_LIMIT = Object.freeze({
  minIntervalMs: Math.max(RATE_LIMIT.minIntervalMs, 60_000),
  maxPerDay: 3,
});
