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

-- 7. BẢNG THÀNH TÍCH — đồng bộ nguyên văn từ docs/leaderboard.sql
-- Bảng thành tích MewTinHoc. Chạy trong Supabase SQL Editor sau khi duyệt.
-- Chỉ bổ sung RPC đọc; không mở rộng SELECT của profiles/user_progress.
BEGIN;

DO $$
BEGIN
  IF pg_catalog.to_regclass('public.profiles') IS NULL
    OR pg_catalog.to_regclass('public.user_progress') IS NULL THEN
    RAISE EXCEPTION 'Required profiles/user_progress tables are missing';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_exp_leaderboard(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '5s'
AS $$
DECLARE
  caller_id uuid := auth.uid();
  page_size integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  page_start integer := GREATEST(COALESCE(p_offset, 0), 0);
  result jsonb;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Một snapshot cho danh sách, tổng số, top 5 và vị trí cá nhân.
  -- Chỉ lấy URL ảnh Google từ Auth; không xuất email/quyền admin/toàn bộ metadata.
  WITH participants AS MATERIALIZED (
    SELECT p.id,
      LEFT(COALESCE(NULLIF(BTRIM(SPLIT_PART(p.username, '@', 1)), ''), 'Học viên Mew'), 80) AS display_name,
      avatar.avatar_url,
      GREATEST(COALESCE(u.xp_total, 0), 0)::bigint AS xp
    FROM public.profiles p
    INNER JOIN public.user_progress u ON u.id = p.id
    LEFT JOIN auth.users a ON a.id = p.id
    LEFT JOIN LATERAL (
      SELECT candidate.url AS avatar_url
      FROM (VALUES
        (1, a.raw_user_meta_data ->> 'avatar_url'),
        (2, a.raw_user_meta_data ->> 'picture'),
        (3, (SELECT COALESCE(NULLIF(i.identity_data ->> 'avatar_url', ''), i.identity_data ->> 'picture')
          FROM auth.identities i WHERE i.user_id = p.id AND i.provider = 'google'
          ORDER BY i.last_sign_in_at DESC NULLS LAST, i.id LIMIT 1))
      ) AS candidate(priority, url)
      WHERE candidate.url ~* '^https://([a-z0-9-]+\.)*googleusercontent\.com/'
      ORDER BY candidate.priority LIMIT 1
    ) avatar ON true
    WHERE u.xp_total > 0
  ), ranked AS MATERIALIZED (
    SELECT id, display_name, avatar_url, xp, RANK() OVER (ORDER BY xp DESC) AS rank,
      id = caller_id AS is_current_user
    FROM participants
  ), meta AS (
    SELECT COUNT(*) AS total,
      LEAST(page_start::bigint, GREATEST((COUNT(*) - 1) / page_size, 0) * page_size) AS actual_offset
    FROM ranked
  ), own AS (
    SELECT r.id, r.display_name, r.avatar_url, r.xp, r.rank, true AS is_current_user
    FROM ranked r WHERE r.id = caller_id
  ), page_rows AS (
    SELECT * FROM ranked ORDER BY xp DESC, id ASC
    LIMIT page_size OFFSET (SELECT actual_offset FROM meta)
  ), top_rows AS (
    SELECT * FROM ranked ORDER BY xp DESC, id ASC LIMIT 5
  )
  SELECT jsonb_build_object(
    'entries', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.xp DESC, r.id ASC) FROM page_rows r), '[]'::jsonb),
    'top', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.xp DESC, r.id ASC) FROM top_rows r), '[]'::jsonb),
    'self', (SELECT to_jsonb(o) FROM own o),
    'next_xp', (SELECT MIN(xp) FROM participants WHERE xp > COALESCE((SELECT xp FROM own), 0)),
    'total', meta.total,
    'offset', meta.actual_offset,
    'limit', page_size,
    'updated_at', CURRENT_TIMESTAMP
  ) INTO result FROM meta;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_exp_leaderboard(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_exp_leaderboard(integer, integer) TO authenticated;

COMMENT ON FUNCTION public.get_exp_leaderboard(integer, integer) IS
  'Bảng EXP chỉ đọc cho người đăng nhập; đồng điểm cùng hạng, UUID chỉ ổn định thứ tự. Không trả email.';

NOTIFY pgrst, 'reload schema';
COMMIT;
-- Chạy bằng Supabase SQL Editor sau khi duyệt. Không cấp quyền cộng EXP cho client.
BEGIN;

CREATE TABLE IF NOT EXISTS public.battle_rewards (
  match_id uuid PRIMARY KEY,
  winner_id uuid NOT NULL REFERENCES auth.users(id),
  runner_up_id uuid NOT NULL REFERENCES auth.users(id),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT battle_distinct_players CHECK (winner_id <> runner_up_id)
);
ALTER TABLE public.battle_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.battle_rewards FROM anon, authenticated;
GRANT SELECT, INSERT ON public.battle_rewards TO service_role;

-- Giá trị mặc định giữ nguyên khoản thưởng của ledger cũ.
ALTER TABLE public.battle_rewards ADD COLUMN IF NOT EXISTS winner_xp integer NOT NULL DEFAULT 100;
ALTER TABLE public.battle_rewards ADD COLUMN IF NOT EXISTS runner_up_xp integer NOT NULL DEFAULT 50;

-- Mỗi khoản thưởng lưu một dòng, kể cả khi đã hết lượt; client không được truy cập.
CREATE TABLE IF NOT EXISTS public.battle_reward_entries (
  match_id uuid NOT NULL REFERENCES public.battle_rewards(match_id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  mode text NOT NULL CHECK (mode IN ('random', 'private')),
  reward_day date NOT NULL,
  awarded_xp integer NOT NULL CHECK (awarded_xp >= 0),
  PRIMARY KEY (match_id, user_id)
);
CREATE INDEX IF NOT EXISTS battle_reward_daily_idx
  ON public.battle_reward_entries(user_id, mode, reward_day) WHERE awarded_xp > 0;
ALTER TABLE public.battle_reward_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.battle_reward_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.battle_reward_entries TO service_role;
ALTER TABLE public.battle_rewards ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE public.battle_rewards ADD COLUMN IF NOT EXISTS reward_day date;
ALTER TABLE public.battle_rewards ADD COLUMN IF NOT EXISTS reward_result jsonb;

-- Bỏ các chữ ký cũ: server phải truyền chế độ và thời điểm kết thúc thật.
DROP FUNCTION IF EXISTS public.award_battle_rewards(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.award_battle_rewards(uuid, uuid, uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.award_battle_rewards(
  p_match_id uuid, p_winner uuid, p_runner_up uuid,
  p_winner_xp integer, p_runner_up_xp integer, p_mode text, p_finished_at bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '8s'
AS $$
DECLARE
  v_day date;
  v_existing public.battle_rewards%ROWTYPE;
  v_player record;
  v_used integer;
  v_xp integer;
  v_players jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  IF p_match_id IS NULL OR p_winner IS NULL OR p_runner_up IS NULL OR p_winner = p_runner_up THEN
    RAISE EXCEPTION 'Invalid battle result';
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('random', 'private') OR p_finished_at IS NULL OR p_finished_at <= 0 THEN
    RAISE EXCEPTION 'Invalid battle reward context';
  END IF;
  IF p_winner_xp IS NULL OR p_runner_up_xp IS NULL OR
    NOT ((p_winner_xp = 100 AND p_runner_up_xp = 50) OR
      (p_mode = 'private' AND p_winner_xp = 50 AND p_runner_up_xp = 20)) THEN
    RAISE EXCEPTION 'Invalid battle rewards';
  END IF;
  -- Ngày của lúc kết thúc trận theo giờ VN; retry hôm sau không chuyển hạn mức sang ngày mới.
  v_day := (pg_catalog.to_timestamp(p_finished_at / 1000.0) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  INSERT INTO public.battle_rewards(match_id, winner_id, runner_up_id, winner_xp, runner_up_xp, mode, reward_day)
    VALUES (p_match_id, p_winner, p_runner_up, p_winner_xp, p_runner_up_xp, p_mode, v_day)
    ON CONFLICT (match_id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO v_existing FROM public.battle_rewards WHERE match_id = p_match_id;
    IF v_existing.winner_id <> p_winner OR v_existing.runner_up_id <> p_runner_up
      OR v_existing.winner_xp <> p_winner_xp OR v_existing.runner_up_xp <> p_runner_up_xp
      OR (v_existing.mode IS NOT NULL AND v_existing.mode <> p_mode)
      OR (v_existing.reward_day IS NOT NULL AND v_existing.reward_day <> v_day) THEN
      RAISE EXCEPTION 'Conflicting battle result';
    END IF;
    -- Ledger cũ đã cộng điểm: chỉ trả lại biên nhận, không cộng hoặc dùng lượt lần nữa.
    RETURN COALESCE(v_existing.reward_result, pg_catalog.jsonb_build_object('players', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id', p_winner, 'awardedXp', v_existing.winner_xp, 'limitReached', false, 'used', NULL),
      pg_catalog.jsonb_build_object('id', p_runner_up, 'awardedXp', v_existing.runner_up_xp, 'limitReached', false, 'used', NULL)
    )));
  END IF;
  -- Khóa theo tài khoản + chế độ + ngày, cùng thứ tự UUID để tránh deadlock giữa hai trận.
  FOR v_player IN
    SELECT * FROM (VALUES (p_winner, p_winner_xp), (p_runner_up, p_runner_up_xp)) AS players(id, xp) ORDER BY id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_player.id::text || ':' || p_mode || ':' || v_day::text, 0));
    SELECT count(*)::integer INTO v_used FROM public.battle_reward_entries
      WHERE user_id = v_player.id AND mode = p_mode AND reward_day = v_day AND awarded_xp > 0;
    v_xp := CASE WHEN v_used < 10 THEN v_player.xp ELSE 0 END;
    INSERT INTO public.battle_reward_entries(match_id, user_id, mode, reward_day, awarded_xp)
      VALUES (p_match_id, v_player.id, p_mode, v_day, v_xp);
    IF v_xp > 0 THEN
      INSERT INTO public.user_progress(id, xp_total) VALUES (v_player.id, v_xp)
        ON CONFLICT (id) DO UPDATE SET xp_total = COALESCE(public.user_progress.xp_total, 0) + EXCLUDED.xp_total;
    END IF;
    v_players := v_players || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'id', v_player.id, 'awardedXp', v_xp, 'limitReached', v_used >= 10,
      'used', LEAST(10, v_used + CASE WHEN v_xp > 0 THEN 1 ELSE 0 END)
    ));
  END LOOP;
  v_result := pg_catalog.jsonb_build_object('players', v_players);
  UPDATE public.battle_rewards SET reward_result = v_result WHERE match_id = p_match_id;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.award_battle_rewards(uuid, uuid, uuid, integer, integer, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_battle_rewards(uuid, uuid, uuid, integer, integer, text, bigint) TO service_role;

-- Client cũ có thể ghi snapshot EXP trước khi nhận Realtime: không cho hạ tổng.
CREATE OR REPLACE FUNCTION public.keep_progress_xp_monotonic()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.xp_total := GREATEST(COALESCE(OLD.xp_total, 0), COALESCE(NEW.xp_total, 0));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS keep_progress_xp_monotonic ON public.user_progress;
CREATE TRIGGER keep_progress_xp_monotonic BEFORE UPDATE OF xp_total ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.keep_progress_xp_monotonic();

COMMIT;
