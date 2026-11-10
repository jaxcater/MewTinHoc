import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('HTTP: bắt buộc auth, không tin userId, giữ kín phòng và giới hạn body', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mew-battle-http-'));
  process.env.EXAM_DATA_ROOT = root;
  process.env.SUPABASE_URL = 'http://127.0.0.1:9';
  process.env.SUPABASE_ANON_KEY = 'test-public';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => {
    if (String(url) === 'http://127.0.0.1:9/auth/v1/user') {
      const token = options.headers.Authorization;
      return Promise.resolve(token === 'Bearer valid-a' || token === 'Bearer valid-b'
        ? new Response(JSON.stringify({ id: token.slice(-1) }), { status: 200 })
        : new Response('{}', { status: 401 }));
    }
    return originalFetch(url, options);
  };
  const { battleMiddleware } = await import('./battleMiddleware.js');
  const server = http.createServer(battleMiddleware);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/battle`;
  const post = (action, body, token = 'valid-a') => originalFetch(`${base}/${action}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  try {
    const unauthorized = await originalFetch(`${base}/state`);
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(unauthorized.headers.get('cache-control'), 'no-store');
    assert.equal((await post('enter', { mode: 'private' }, 'invalid')).status, 401);
    const response = await post('enter', { mode: 'private', userId: 'victim', profile: { name: 'Người thử', avatar: 'javascript:alert(1)' } });
    assert.equal(response.status, 200);
    const { room } = await response.json();
    assert.equal(room.me, 'a'); assert.equal(room.players[0].avatar, '');
    assert.equal((await post('ready', { roomId: room.id, ready: true }, 'valid-b')).status, 404);
    const other = await originalFetch(`${base}/state`, { headers: { Authorization: 'Bearer valid-b' } });
    assert.equal((await other.json()).room, null);
    const tooLarge = await post('enter', { mode: 'private', padding: 'x'.repeat(9000) });
    assert.equal(tooLarge.status, 413);
    const badJson = await originalFetch(`${base}/enter`, { method: 'POST', headers: { Authorization: 'Bearer valid-a' }, body: '{' });
    assert.equal(badJson.status, 400);
    const method = await originalFetch(`${base}/enter`, { headers: { Authorization: 'Bearer valid-a' } });
    assert.equal(method.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    globalThis.fetch = originalFetch;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
