import { supabase } from '../supabase.js';

export const USER_ACTIVITY_BUCKET = 'user-activity-logs';
export const USER_ACTIVITY_FOLDER = 'log user and timer';
export const USER_ACTIVITY_IDLE_MS = 2 * 60 * 1000;

export function vietnamDateKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
}

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

export function activityLogPath(userId, date = new Date()) {
  const cleanUserId = safeId(userId);
  if (!cleanUserId) throw new Error('User ID không hợp lệ');
  return `${USER_ACTIVITY_FOLDER}/${cleanUserId}/${vietnamDateKey(date)}/usage.json`;
}

export function normalizeActivityLog(value) {
  if (!value || typeof value !== 'object') return null;
  const activeSeconds = Math.max(0, Math.floor(Number(value.activeSeconds) || 0));
  const lastSeenAt = new Date(value.lastSeenAt);
  if (!value.userId || !value.sessionId || Number.isNaN(lastSeenAt.getTime())) return null;
  return { ...value, userId: String(value.userId), sessionId: String(value.sessionId), activeSeconds,
    lastSeenAt: lastSeenAt.toISOString() };
}

export async function uploadActivityLog(path, payload) {
  if (!supabase) return { success: false, error: 'Chưa cấu hình Supabase.' };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const { error } = await supabase.storage.from(USER_ACTIVITY_BUCKET).upload(path, blob, {
    contentType: 'application/json', upsert: true, cacheControl: '0',
  });
  return error ? { success: false, error: error.message || 'Không ghi được log.' } : { success: true };
}

export async function fetchActivityLog(path) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(USER_ACTIVITY_BUCKET).download(path);
  if (error) return null;
  try { return normalizeActivityLog(JSON.parse(await data.text())); } catch { return null; }
}

async function listAll(path, limit = 1000) {
  const { data, error } = await supabase.storage.from(USER_ACTIVITY_BUCKET).list(path, {
    limit, sortBy: { column: 'name', order: 'desc' },
  });
  if (error) throw error;
  return data || [];
}

export async function fetchTodayActivityLogs(now = new Date()) {
  if (!supabase) return { logs: [], error: 'Chưa cấu hình Supabase.', missingBucket: false };
  try {
    const users = await listAll(USER_ACTIVITY_FOLDER, 500);
    const dateKey = vietnamDateKey(now);
    const paths = [];
    await Promise.all(users.filter((item) => item.name && !item.id).map(async (user) => {
      const folder = `${USER_ACTIVITY_FOLDER}/${user.name}/${dateKey}`;
      const files = await listAll(folder, 100);
      for (const file of files) if (file.name?.endsWith('.json')) paths.push(`${folder}/${file.name}`);
    }));
    const logs = (await Promise.all(paths.map(async (path) => {
      const { data, error } = await supabase.storage.from(USER_ACTIVITY_BUCKET).download(path);
      if (error) return null;
      try { return normalizeActivityLog(JSON.parse(await data.text())); } catch { return null; }
    }))).filter(Boolean);
    return { logs, error: null, missingBucket: false };
  } catch (error) {
    const message = error?.message || 'Không đọc được log hoạt động.';
    return { logs: [], error: message, missingBucket: /bucket.*not found|not found/i.test(message) };
  }
}

export function summarizeActivityLogs(logs, now = new Date()) {
  const byUser = new Map();
  for (const raw of logs || []) {
    const log = normalizeActivityLog(raw);
    if (!log) continue;
    const current = byUser.get(log.userId) || { userId: log.userId, activeSeconds: 0,
      sessions: 0, lastSeenAt: null, lastPath: '/' };
    current.activeSeconds += log.activeSeconds;
    current.sessions += Math.max(1, Math.floor(Number(log.sessionCount) || 1));
    if (!current.lastSeenAt || Date.parse(log.lastSeenAt) > Date.parse(current.lastSeenAt)) {
      current.lastSeenAt = log.lastSeenAt;
      current.lastPath = log.lastPath || '/';
    }
    byUser.set(log.userId, current);
  }
  const users = [...byUser.values()].sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
  const onlineCutoff = now.getTime() - USER_ACTIVITY_IDLE_MS;
  return { users, uniqueUsers: users.length,
    onlineUsers: users.filter((user) => Date.parse(user.lastSeenAt) >= onlineCutoff).length,
    activeSeconds: users.reduce((sum, user) => sum + user.activeSeconds, 0),
    sessions: users.reduce((sum, user) => sum + user.sessions, 0) };
}

export const USER_ACTIVITY_SQL = `-- Bucket riêng tư lưu thời gian sử dụng của học viên
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('${USER_ACTIVITY_BUCKET}', '${USER_ACTIVITY_BUCKET}', false, 65536, ARRAY['application/json'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 65536,
  allowed_mime_types = ARRAY['application/json'];

DROP POLICY IF EXISTS "activity_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_update_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_select_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_select_admin" ON storage.objects;

CREATE POLICY "activity_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = '${USER_ACTIVITY_BUCKET}'
    AND (storage.foldername(name))[1] = '${USER_ACTIVITY_FOLDER}'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "activity_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = '${USER_ACTIVITY_BUCKET}'
    AND (storage.foldername(name))[1] = '${USER_ACTIVITY_FOLDER}'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = '${USER_ACTIVITY_BUCKET}'
    AND (storage.foldername(name))[1] = '${USER_ACTIVITY_FOLDER}'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Supabase Storage cáº§n SELECT trÃªn chÃ­nh file Ä‘á»ƒ upsert báº£n ghi má»›i nháº¥t.
CREATE POLICY "activity_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = '${USER_ACTIVITY_BUCKET}'
    AND (storage.foldername(name))[1] = '${USER_ACTIVITY_FOLDER}'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "activity_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = '${USER_ACTIVITY_BUCKET}' AND public.is_admin_user());`;
