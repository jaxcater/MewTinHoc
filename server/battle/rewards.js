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
    body: JSON.stringify({ p_match_id: room.id, p_winner: room.results[0].id, p_runner_up: room.results[1].id }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Reward RPC returned ${response.status}`);
  return true;
}
