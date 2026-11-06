-- ==============================================================
-- MewTinHoc — CẤU HÌNH SUPABASE (chạy 1 lần)
-- Dán toàn bộ file này vào: Supabase Dashboard > SQL Editor > New query > Run
-- An toàn để chạy lại nhiều lần (idempotent).
-- ==============================================================


-- ==============================================================
-- 1. BẢNG PROFILES + ĐỒNG BỘ TÀI KHOẢN ĐANG CÓ
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  userid TEXT,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Đổ toàn bộ tài khoản hiện có sang profiles.
-- Người đã có hồ sơ thì GIỮ NGUYÊN quyền (không tự phong Admin).
INSERT INTO public.profiles (id, userid, username, email, is_admin, created_at)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'user_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  FALSE,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- CẤP QUYỀN ADMIN: thêm/bớt email ở đây rồi chạy lại khi cần.
UPDATE public.profiles
SET is_admin = TRUE
WHERE email IN (
  'jaxcater1906@gmail.com',
  'thannhi0948@gmail.com',
  'kado30az@gmail.com',
  'killeran72@gmail.com'
);


-- ==============================================================
-- 2. NGƯỜI ĐĂNG KÝ SAU NÀY TỰ CÓ HỒ SƠ (mặc định KHÔNG phải Admin)
-- ==============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, userid, username, email, is_admin, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    FALSE,
    new.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==============================================================
-- 3. RLS CHO PROFILES
-- ==============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER để tránh "infinite recursion" khi policy tự truy vấn bảng.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false);
$$;

DROP POLICY IF EXISTS "Cho phép xem profiles" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép cập nhật profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_only" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin_user());

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND is_admin = false);

CREATE POLICY "profiles_update_admin_only" ON public.profiles
  FOR UPDATE USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


-- ==============================================================
-- 4. BUCKET "KhoTaiLieuTinHocThiThu" — SỬA LỖI 404 NoSuchKey
--    Đây chính là nguyên nhân các request json đỏ trong Network:
--    thiếu policy SELECT nên Supabase giấu object -> trả NoSuchKey.
-- ==============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('KhoTaiLieuTinHocThiThu', 'KhoTaiLieuTinHocThiThu', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_read_all" ON storage.objects;

-- ĐỌC: cho phép cả khách (anon) vì app tải PDF/roadmap trước khi đăng nhập.
CREATE POLICY "storage_read_all" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'KhoTaiLieuTinHocThiThu');

-- GHI/SỬA/XOÁ: chỉ Admin.
CREATE POLICY "storage_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'KhoTaiLieuTinHocThiThu' AND public.is_admin_user());

CREATE POLICY "storage_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'KhoTaiLieuTinHocThiThu' AND public.is_admin_user())
  WITH CHECK (bucket_id = 'KhoTaiLieuTinHocThiThu' AND public.is_admin_user());

CREATE POLICY "storage_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'KhoTaiLieuTinHocThiThu' AND public.is_admin_user());


-- ==============================================================
-- 5. BUCKET "user-activity-logs" — TÍNH NĂNG ĐẾM GIỜ HỌC
--    (commit "Them timer"). Chưa có bucket này thì mọi request
--    .../log user and timer/<uid>/<ngày>/usage.json đều 404.
-- ==============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-activity-logs', 'user-activity-logs', false, 65536, ARRAY['application/json'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 65536,
  allowed_mime_types = ARRAY['application/json'];

DROP POLICY IF EXISTS "activity_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_update_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_select_own" ON storage.objects;
DROP POLICY IF EXISTS "activity_select_admin" ON storage.objects;

CREATE POLICY "activity_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-activity-logs'
    AND (storage.foldername(name))[1] = 'log user and timer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Supabase Storage cần SELECT trên chính file để upsert bản ghi mới nhất.
CREATE POLICY "activity_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-activity-logs'
    AND (storage.foldername(name))[1] = 'log user and timer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "activity_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-activity-logs'
    AND (storage.foldername(name))[1] = 'log user and timer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-activity-logs'
    AND (storage.foldername(name))[1] = 'log user and timer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "activity_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-activity-logs' AND public.is_admin_user());


-- ==============================================================
-- 6. KIỂM TRA (xem kết quả ở tab cuối)
-- ==============================================================
SELECT 'profiles' AS table_name, COUNT(*) AS rows FROM public.profiles
UNION ALL
SELECT 'buckets', COUNT(*) FROM storage.buckets
WHERE id IN ('KhoTaiLieuTinHocThiThu', 'user-activity-logs')
UNION ALL
SELECT 'storage_policies', COUNT(*) FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname IN (
    'storage_read_all','storage_insert_admin','storage_update_admin','storage_delete_admin',
    'activity_insert_own','activity_update_own','activity_select_own','activity_select_admin'
  );
