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
