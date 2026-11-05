import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyChatCaller } from './exam/auth.js';
import { botpressMiddleware } from './botpressMiddleware.js';

test('chat admin exemption is bound to verified identity and the persisted profile', async (t) => {
  let requests = [];
  let profile = [{ is_admin: true }];
  let authValid = true;
  let profileFailure = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('/auth/v1/user')) {
      return Response.json({ id: 'verified-account', user_metadata: { is_admin: true } }, { status: authValid ? 200 : 401 });
    }
    if (profileFailure) throw new Error('profile unavailable');
    return Response.json(profile);
  });
  const req = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {}, socket: { remoteAddress: '127.0.0.1' },
    body: { isAdmin: true, is_admin: true, userId: 'other-admin' } });

  await t.test('guest cannot promote themselves through the request body', async () => {
    const caller = await identifyChatCaller(req());
    assert.equal(caller.isAdmin, false);
    assert.equal(requests.length, 0);
  });
  await t.test('verified admin gets unlimited quota through the API', async () => {
    let response;
    await botpressMiddleware({ ...req('valid-admin-token'), url: '/api/botpress/quota', method: 'GET' }, {
      setHeader() {},
      end(body) { response = JSON.parse(body); },
    });
    assert.equal(response.quota.unlimited, true);
    assert.equal(response.quota.remaining, null);
    const profileRequest = requests.find((request) => request.url.includes('/rest/v1/profiles'));
    assert.match(profileRequest.url, /id=eq.verified-account&select=is_admin/);
    assert.equal(profileRequest.options.headers.Authorization, 'Bearer valid-admin-token');
  });
  await t.test('role revocation is checked again even when identity is cached', async () => {
    profile = [{ is_admin: false }];
    assert.equal((await identifyChatCaller(req('valid-admin-token'))).isAdmin, false);
  });
  await t.test('missing, malformed, or unavailable profiles do not grant admin', async () => {
    for (const value of [[], [{ is_admin: 'true' }], { is_admin: true }]) {
      profile = value;
      assert.equal((await identifyChatCaller(req('valid-admin-token'))).isAdmin, false);
    }
    profileFailure = true;
    assert.equal((await identifyChatCaller(req('valid-admin-token'))).isAdmin, false);
  });
  await t.test('invalid token never reaches the profile endpoint', async () => {
    requests = [];
    authValid = false;
    assert.equal((await identifyChatCaller(req('invalid-token'))).isAdmin, false);
    assert.equal(requests.length, 1);
  });
});
