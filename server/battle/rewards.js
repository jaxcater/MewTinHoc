import { loadRepoEnv, readEnv } from '../envLoader.js';
loadRepoEnv();

/** RPC chỉ service_role được gọi; match_id bảo đảm trả thưởng đúng một lần. */
export async function awardBattleRewards(room) {
  const url = readEnv('SUPABASE_URL', readEnv('VITE_SUPABASE_URL'));
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return false;
  const response = await fetch(`${url}/rest/v1/rpc/award_battle_rewards`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    // Dùng khoản thưởng đã lưu để retry/restart không thay đổi EXP của trận cũ.
    body: JSON.stringify({ p_match_id: room.id, p_winner: room.results[0].id, p_runner_up: room.results[1].id,
      p_winner_xp: room.results[0].xp, p_runner_up_xp: room.results[1].xp,
      p_mode: room.mode, p_finished_at: room.finishedAt }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Reward RPC returned ${response.status}`);
  const result = await response.json();
  // Không báo đã cộng nếu RPC cũ hoặc response thiếu kết quả áp dụng hạn mức.
  if (!Array.isArray(result?.players) || result.players.length !== 2) throw new Error('Invalid reward receipt');
  for (const player of room.results.slice(0, 2)) {
    const receipts = result.players.filter(p => p.id === player.id);
    const receipt = receipts[0];
    if (receipts.length !== 1 || typeof receipt.limitReached !== 'boolean'
      || (receipt.limitReached ? receipt.awardedXp !== 0 || receipt.used !== 10
        : receipt.awardedXp !== player.xp || (receipt.used !== null && (!Number.isInteger(receipt.used) || receipt.used < 1 || receipt.used > 10)))) {
      throw new Error('Invalid reward receipt');
    }
  }
  return result;
}
