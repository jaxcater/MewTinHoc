import { supabase } from '../supabase';
import { LEADERBOARD_PAGE_SIZE, parseLeaderboard } from './leaderboardModel';

export async function fetchLeaderboard(offset, signal) {
  const { data, error } = await supabase.rpc('get_exp_leaderboard', {
    p_limit: LEADERBOARD_PAGE_SIZE,
    p_offset: Math.max(0, Math.trunc(offset) || 0)
  }).abortSignal(signal);
  if (error) {
    const failure = new Error('Could not load leaderboard');
    failure.code = ['PGRST202', '42883', '42P01', '42703'].includes(error.code)
      ? 'SETUP_REQUIRED' : ['42501', 'PGRST301', 'PGRST303'].includes(error.code) ? 'AUTH_REQUIRED' : 'UNAVAILABLE';
    throw failure;
  }
  return parseLeaderboard(data);
}
