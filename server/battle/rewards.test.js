import test from 'node:test';
import assert from 'node:assert/strict';
import { awardBattleRewards } from './rewards.js';

function mockRpc(t, responder) {
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const previous = keys.map(key => process.env[key]);
  process.env.SUPABASE_URL = 'https://battle-test.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  t.after(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key];
    else process.env[key] = previous[index];
  }));
  t.mock.method(globalThis, 'fetch', async (_url, options) => ({ ok: true,
    json: async () => responder(JSON.parse(options.body)) }));
}
const makeRoom = (mode = 'random', xp = [100, 50]) => ({ id: 'match-id', mode, finishedAt: 1_800_000_000_000,
  results: [{ id: 'winner', xp: xp[0] }, { id: 'runner-up', xp: xp[1] }] });

const receipt = (body, used = 1) => ({ players: [
  { id: body.p_winner, awardedXp: body.p_winner_xp, limitReached: false, used },
  { id: body.p_runner_up, awardedXp: body.p_runner_up_xp, limitReached: false, used },
] });

test('RPC nhận khoản EXP đã lưu, chế độ và thời điểm kết thúc; không dùng thời điểm retry', async t => {
  let request;
  mockRpc(t, body => { request = body; return receipt(body); });
  for (const [mode, xp] of [['random', [100, 50]], ['private', [50, 20]], ['private', [100, 50]]]) {
    const room = makeRoom(mode, xp);
    assert.deepEqual(await awardBattleRewards(room), receipt(request));
    assert.deepEqual(request, { p_match_id: room.id, p_winner: 'winner', p_runner_up: 'runner-up',
      p_winner_xp: xp[0], p_runner_up_xp: xp[1], p_mode: mode, p_finished_at: room.finishedAt });
  }
});

test('lượt thứ 10 vẫn nhận đủ EXP; biên nhận hạng nhất hết lượt không ảnh hưởng hạng nhì', async t => {
  let capped = false;
  mockRpc(t, body => {
    const result = receipt(body, 10);
    if (capped) result.players[0] = { id: 'winner', awardedXp: 0, limitReached: true, used: 10 };
    return result;
  });
  assert.equal((await awardBattleRewards(makeRoom())).players[0].awardedXp, 100);
  capped = true;
  const result = await awardBattleRewards(makeRoom());
  assert.equal(result.players[0].awardedXp, 0);
  assert.equal(result.players[0].limitReached, true);
  assert.equal(result.players[1].awardedXp, 50);
});

test('biên nhận ledger cũ có thể không có bộ đếm; vẫn giữ EXP đã cộng', async t => {
  mockRpc(t, body => receipt(body, null));
  assert.equal((await awardBattleRewards(makeRoom('private'))).players[0].awardedXp, 100);
});

test('không đánh dấu đã cộng nếu RPC thiếu biên nhận hoặc trả sai số EXP/hạn mức', async t => {
  let response;
  mockRpc(t, () => response);
  const base = receipt({ p_winner: 'winner', p_runner_up: 'runner-up', p_winner_xp: 100, p_runner_up_xp: 50 });
  for (const invalid of [null, { players: [] },
    { players: [base.players[0], base.players[0]] },
    { players: [{ ...base.players[0], awardedXp: 999 }, base.players[1]] },
    { players: [{ ...base.players[0], awardedXp: 0 }, base.players[1]] },
    { players: [{ ...base.players[0], awardedXp: 0, limitReached: true, used: 9 }, base.players[1]] },
    { players: [{ ...base.players[0], used: 11 }, base.players[1]] },
  ]) {
    response = invalid;
    await assert.rejects(() => awardBattleRewards(makeRoom()), /Invalid reward receipt/);
  }
});
