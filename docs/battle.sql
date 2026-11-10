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
