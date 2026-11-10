import { supabase } from '../supabase.js';

let cachedToken = '';
export async function battleRequest(action, body, signal) {
  const { data } = await supabase.auth.getSession();
  cachedToken = data?.session?.access_token || '';
  const response = await fetch(`/api/battle/${action}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cachedToken}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw Object.assign(new Error(result.message || 'Request failed'), { code: result.code });
  return result.room;
}

/** Rời phòng chờ khi điều hướng/đóng tab; roomId ngăn request cũ ảnh hưởng phòng mới. */
export function leaveBattleOnExit(room) {
  if (!room || room.status !== 'waiting' || !cachedToken) return;
  void fetch('/api/battle/leave', { method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cachedToken}` },
    body: JSON.stringify({ roomId: room.id }) }).catch(() => {});
}
