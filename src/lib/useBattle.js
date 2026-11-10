import { useCallback, useEffect, useRef, useState } from 'react';
import { battleRequest, leaveBattleOnExit } from './battleApi';

export function useBattle(user) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState({});
  const current = useRef(null);
  const pendingRef = useRef({});
  const queue = useRef(Promise.resolve());
  const mounted = useRef(false);
  const clockOffset = useRef(0);
  const accept = useCallback(next => {
    if (!mounted.current) return;
    if (next && current.current?.id === next.id && next.version < current.current.version) return;
    if (next) clockOffset.current = next.serverNow - Date.now();
    current.current = next;
    setRoom(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const polling = { timer: null, stopped: false };
    const controller = new AbortController();
    async function poll() {
      const requestedRoom = current.current?.id;
      try {
        const next = await battleRequest('state', undefined, controller.signal);
        if (!polling.stopped) {
          if (current.current?.id === requestedRoom) accept(next);
          setLoading(false);
        }
      } catch (err) {
        if (!polling.stopped) { setError(err.message); setLoading(false); }
      } finally { if (!polling.stopped) polling.timer = setTimeout(poll, 1200); }
    }
    void poll();
    const exit = () => leaveBattleOnExit(current.current);
    window.addEventListener('pagehide', exit);
    return () => {
      polling.stopped = true; mounted.current = false; controller.abort(); clearTimeout(polling.timer);
      window.removeEventListener('pagehide', exit); exit();
    };
  }, [user.id, accept]);

  const action = useCallback(async (name, payload = {}) => {
    setBusy(true); setError('');
    try {
      const next = await battleRequest(name, { roomId: current.current?.id, ...payload });
      accept(next);
      return true;
    } catch (err) { if (mounted.current) setError(err.message); return false; }
    finally { if (mounted.current) setBusy(false); }
  }, [accept]);

  const sendAnswer = useCallback((questionId, entry, roomId) => {
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (!mounted.current || current.current?.id !== roomId) return;
      try {
        const next = await battleRequest('answer', { roomId, questionId, ...entry });
        if (!mounted.current || current.current?.id !== roomId) return;
        if (pendingRef.current[questionId]?.revision === entry.revision) {
          const remaining = { ...pendingRef.current }; delete remaining[questionId];
          pendingRef.current = remaining; setPending(remaining);
        }
        accept(next);
      } catch (err) { if (mounted.current) setError(err.message); }
    });
    return queue.current;
  }, [accept]);

  const answer = useCallback((questionId, value) => {
    const active = current.current;
    if (!active || active.status !== 'playing') return;
    const previous = pendingRef.current[questionId] || active.answers[questionId];
    const entry = { value, revision: Math.max(Date.now(), (previous?.revision || 0) + 1) };
    pendingRef.current = { ...pendingRef.current, [questionId]: entry };
    setPending(pendingRef.current); setError('');
    void sendAnswer(questionId, entry, active.id);
  }, [sendAnswer]);
  const retry = useCallback(async () => {
    setError('');
    for (const [id, entry] of Object.entries(pendingRef.current)) await sendAnswer(id, entry, current.current?.id);
  }, [sendAnswer]);
  const submit = useCallback(async () => {
    await queue.current;
    if (Object.keys(pendingRef.current).length) { await retry(); }
    if (Object.keys(pendingRef.current).length) return;
    await action('submit');
  }, [action, retry]);
  const enter = (mode, code) => action('enter', { mode, code, profile: { name: user.name, avatar: user.avatar } });
  const leave = async () => {
    if (await action('leave')) { pendingRef.current = {}; setPending({}); }
  };
  return { room, loading, busy, error, pending, clockOffset, enter, leave, answer, submit, retry,
    ready: value => action('ready', { ready: value }),
    answers: { ...room?.answers, ...pending } };
}
