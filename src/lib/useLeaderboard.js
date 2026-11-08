import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLeaderboard } from './leaderboardService';

export function useLeaderboard(user) {
  const userId = user?.id;
  const isDemo = user?.isDemo === true;
  const [state, setState] = useState({ board: null, owner: null, request: null, error: null });
  const [request, setRequest] = useState({ offset: 0, version: 0 });
  const latestRef = useRef(null);
  const reload = useCallback(() => setRequest(previous => ({ ...previous, version: previous.version + 1 })), []);
  const goToPage = useCallback(offset => setRequest(previous => ({ offset, version: previous.version + 1 })), []);

  useEffect(() => {
    if (!userId || isDemo) return;
    const controller = new AbortController();
    latestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(new DOMException('Leaderboard request timed out', 'TimeoutError')), 12000);
    fetchLeaderboard(request.offset, controller.signal).then(board => {
      if (latestRef.current === controller && !controller.signal.aborted) {
        setState({ board, owner: userId, request, error: null });
      }
    }).catch(error => {
      if (latestRef.current !== controller || (controller.signal.aborted && controller.signal.reason?.name !== 'TimeoutError')) return;
      setState(previous => ({ board: previous.owner === userId ? previous.board : null,
        owner: userId, request, error: error.code || 'UNAVAILABLE' }));
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      latestRef.current = null;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [userId, isDemo, request]);

  useEffect(() => {
    if (!userId || isDemo) return;
    // Poll nhẹ khi tab đang mở; không mở subscription toàn bộ dữ liệu cá nhân.
    const interval = window.setInterval(() => { if (!document.hidden) reload(); }, 60000);
    return () => window.clearInterval(interval);
  }, [userId, isDemo, reload]);

  const ownState = state.owner === userId && !isDemo;
  const loading = !isDemo && (!ownState || state.request !== request);
  return { board: ownState ? state.board : null, loading,
    error: ownState && !loading ? state.error : null, reload, goToPage, isDemo };
}
