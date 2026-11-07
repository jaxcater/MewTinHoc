import { supabase } from '../supabase.js';

/**
 * Thông báo toàn hệ thống do Admin tạo, mọi người truy cập web (kể cả chưa đăng nhập) đều nhận được.
 * Dữ liệu nằm ở bảng `public.announcements` trên Supabase.
 * Việc "không hiển thị lại" được lưu ở trình duyệt của từng học viên (localStorage)
 * kèm thời hạn: 24 giờ cho thông báo thường, 12 giờ cho thông báo gắn tag QUAN TRỌNG.
 */

export const ANNOUNCEMENT_TYPES = {
  info: { label: 'Thông tin' },
  success: { label: 'Tin vui' },
  important: { label: 'Cảnh báo' },
  event: { label: 'Sự kiện' }
};

export const ANNOUNCEMENT_LIMITS = { title: 80, message: 400 };

const DISMISSED_KEY = 'mewtinhoc_dismissed_announcements';

// Bảng chưa tạo (PGRST205 / 42P01) hoặc thiếu cột is_important (42703 / PGRST204)
const MISSING_SCHEMA_CODES = ['PGRST205', '42P01', '42703', 'PGRST204'];
const isMissingSchema = (error) => MISSING_SCHEMA_CODES.includes(error?.code);

export const ANNOUNCEMENTS_SQL = `-- ==============================================================
-- 6. BẢNG THÔNG BÁO TOÀN HỆ THỐNG (Admin tạo, học viên nhận)
-- (Cần chạy sau phần 1-4 vì dùng hàm public.is_admin_user())
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND ${ANNOUNCEMENT_LIMITS.title}),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND ${ANNOUNCEMENT_LIMITS.message}),
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'important', 'event')),
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nếu bảng đã tạo từ trước: thêm cột tag QUAN TRỌNG (hiện giữa màn hình, làm mờ nền)
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_admin" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_admin" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_admin" ON public.announcements;

-- XEM: ai cũng xem được thông báo đang bật (kể cả khách chưa đăng nhập); Admin xem được tất cả
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin_user());

-- THÊM / SỬA / XOÁ: chỉ Admin
CREATE POLICY "announcements_insert_admin" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user());

CREATE POLICY "announcements_update_admin" ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "announcements_delete_admin" ON public.announcements
  FOR DELETE TO authenticated USING (public.is_admin_user());`;

/** Diễn giải lỗi Supabase sang tiếng Việt cho Admin dễ xử lý */
function describeError(error) {
  if (isMissingSchema(error)) {
    return 'Bảng `announcements` chưa được tạo hoặc thiếu cột mới. Hãy chạy câu lệnh SQL bên dưới trong Supabase SQL Editor.';
  }
  const raw = error?.message || 'Không xác định';
  if (/row-level security|violates|permission denied|JWT/i.test(raw) || error?.code === '42501') {
    return 'Supabase từ chối vì tài khoản chưa có quyền Admin (RLS). Hãy đăng nhập lại bằng tài khoản Admin.';
  }
  return raw;
}

/** Học viên: lấy các thông báo đang bật, mới nhất trước. Lỗi thì trả mảng rỗng, không làm hỏng trang. */
export async function fetchActiveAnnouncements() {
  if (!supabase) return [];
  const query = (columns) =>
    supabase
      .from('announcements')
      .select(columns)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);
  try {
    const { data, error } = await query('id, title, message, type, is_important, created_at');
    if (!error) return data || [];
    // Admin chưa chạy SQL thêm cột is_important: vẫn hiện thông báo như bình thường
    if (error.code === '42703' || error.code === 'PGRST204') {
      const fallback = await query('id, title, message, type, created_at');
      return fallback.error ? [] : fallback.data || [];
    }
    return [];
  } catch {
    return [];
  }
}

/** Admin: lấy toàn bộ thông báo (cả đã tắt) */
export async function fetchAllAnnouncements() {
  if (!supabase) return { rows: [], error: 'Chưa cấu hình Supabase Client.', missingTable: false };
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, message, type, is_important, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      return { rows: [], error: describeError(error), missingTable: isMissingSchema(error) };
    }
    return { rows: data || [], error: null, missingTable: false };
  } catch (err) {
    return { rows: [], error: err?.message || 'Lỗi kết nối Supabase', missingTable: false };
  }
}

export async function createAnnouncement({ title, message, type, isImportant = false }) {
  if (!supabase) return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  const cleanTitle = String(title || '').trim().slice(0, ANNOUNCEMENT_LIMITS.title);
  const cleanMessage = String(message || '').trim().slice(0, ANNOUNCEMENT_LIMITS.message);
  const cleanType = ANNOUNCEMENT_TYPES[type] ? type : 'info';
  if (!cleanTitle || !cleanMessage) {
    return { success: false, error: 'Vui lòng nhập đủ tiêu đề và nội dung.' };
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({ title: cleanTitle, message: cleanMessage, type: cleanType, is_important: !!isImportant })
    .select('id, title, message, type, is_important, is_active, created_at')
    .single();

  if (error) return { success: false, error: describeError(error) };
  return { success: true, data };
}

export async function setAnnouncementActive(id, isActive) {
  if (!supabase) return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  const { error } = await supabase.from('announcements').update({ is_active: !!isActive }).eq('id', id);
  return error ? { success: false, error: describeError(error) } : { success: true };
}

export async function deleteAnnouncement(id) {
  if (!supabase) return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  return error ? { success: false, error: describeError(error) } : { success: true };
}

/* ===== Ghi nhớ thông báo học viên đã chọn "không hiển thị lại" ===== */

/**
 * Thời gian thông báo được ẩn sau khi học viên tick "Không hiển thị lại":
 * - Thông báo thường: 24 giờ
 * - Thông báo gắn tag QUAN TRỌNG: 12 giờ
 * Hết thời gian này thông báo tự hiện lại (không cần học viên xoá ghi nhớ).
 */
export const DISMISS_TTL_NORMAL_MS = 24 * 60 * 60 * 1000;
export const DISMISS_TTL_IMPORTANT_MS = 12 * 60 * 60 * 1000;

/** localStorage lưu map { [id]: thời điểm hết hạn (ms) } */
function readDismissMap() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Định dạng cũ: mảng id (ẩn vĩnh viễn) -> chuyển sang mốc hết hạn.
    // Dùng mốc ngắn nhất (12h) vì không biết thông báo nào có tag QUAN TRỌNG.
    if (Array.isArray(parsed)) {
      const expiresAt = Date.now() + DISMISS_TTL_IMPORTANT_MS;
      const migrated = {};
      parsed.forEach((id) => {
        if (typeof id === 'string' && id) migrated[id] = expiresAt;
      });
      writeDismissMap(migrated);
      return migrated;
    }
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeDismissMap(map) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
    return true;
  } catch {
    // localStorage bị chặn: thông báo chỉ ẩn trong phiên hiện tại
    return false;
  }
}

/**
 * Danh sách thông báo đang được ẩn kèm thời điểm hết hạn: { [id]: expiresAt }.
 * Mục đã hết hạn bị loại bỏ (thông báo hiện lại).
 */
export function getDismissedMap() {
  const map = readDismissMap();
  const now = Date.now();
  const valid = {};
  let changed = false;
  Object.entries(map).forEach(([id, expiresAt]) => {
    const ts = Number(expiresAt);
    if (!id || !Number.isFinite(ts)) {
      changed = true;
      return;
    }
    if (ts > now) valid[id] = ts;
    else changed = true; // đã hết hạn -> thông báo hiện lại
  });
  if (changed) writeDismissMap(valid);
  return valid;
}

/**
 * Ghi nhớ "không hiển thị lại": ẩn thông báo trong 24h (thường) hoặc 12h (tag QUAN TRỌNG).
 * Trả về thời điểm hết hạn (ms).
 */
export function dismissAnnouncement(id, { isImportant = false } = {}) {
  const ttl = isImportant ? DISMISS_TTL_IMPORTANT_MS : DISMISS_TTL_NORMAL_MS;
  const expiresAt = Date.now() + ttl;
  // Dùng getDismissedMap() để loại bỏ luôn các mục đã hết hạn
  const map = getDismissedMap();
  map[id] = expiresAt;
  writeDismissMap(map);
  return expiresAt;
}
