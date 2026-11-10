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

CREATE OR REPLACE FUNCTION public.award_battle_rewards(p_match_id uuid, p_winner uuid, p_runner_up uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '8s'
AS $$
BEGIN
  IF p_match_id IS NULL OR p_winner IS NULL OR p_runner_up IS NULL OR p_winner = p_runner_up THEN
    RAISE EXCEPTION 'Invalid battle result';
  END IF;
  INSERT INTO public.battle_rewards(match_id, winner_id, runner_up_id)
    VALUES (p_match_id, p_winner, p_runner_up)
    ON CONFLICT (match_id) DO NOTHING;
  IF NOT FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM public.battle_rewards WHERE match_id = p_match_id
      AND winner_id = p_winner AND runner_up_id = p_runner_up) THEN
      RAISE EXCEPTION 'Conflicting battle result';
    END IF;
    RETURN;
  END IF;
  -- Ledger và hai lần cộng EXP nằm trong cùng transaction: retry không cộng trùng.
  INSERT INTO public.user_progress(id, xp_total)
    VALUES (p_winner, 100), (p_runner_up, 50)
    ON CONFLICT (id) DO UPDATE SET
      xp_total = COALESCE(public.user_progress.xp_total, 0) + EXCLUDED.xp_total;
END;
$$;
REVOKE ALL ON FUNCTION public.award_battle_rewards(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_battle_rewards(uuid, uuid, uuid) TO service_role;

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
