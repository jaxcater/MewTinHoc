import { useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { activityLogPath, fetchActivityLog, uploadActivityLog, USER_ACTIVITY_IDLE_MS } from './userActivityStorage.js';

const TICK_MS = 5000;
const UPLOAD_MS = 30000;
const LEASE_MS = 15000;
const LEASE_KEY = 'mewtinhoc_activity_timer_leader';

function newId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function canOwnActivityLease(stored, tabId, now = Date.now()) {
  return !stored || stored.tabId === tabId || Number(stored.expiresAt) <= now;
}

/** Counts foreground, recently-interacted time for authenticated non-demo users. */
export function useUserActivityTimer(user, currentPath = '/') {
  const pathRef = useRef(currentPath);
  useEffect(() => { pathRef.current = currentPath; }, [currentPath]);

  useEffect(() => {
    if (!supabase || !user?.id || user.isDemo) return undefined;
    let stopped = false;
    let isLeader = false;
    let activeMs = 0;
    let uploadedSeconds = -1;
    let lastTickAt = Date.now();
    let lastActivityAt = Date.now();
    let lastUploadAt = 0;
    let uploadPending = false;
    let initialized = false;
    let sessionCount = 1;
    const tabId = newId();
    const sessionId = newId();
    const startedAt = new Date().toISOString();
    const logPath = activityLogPath(user.id);

    const readLease = () => {
      try { return JSON.parse(localStorage.getItem(LEASE_KEY) || 'null'); } catch { return null; }
    };
    const claimLease = () => {
      const now = Date.now();
      const stored = readLease();
      if (canOwnActivityLease(stored, tabId, now)) {
        localStorage.setItem(LEASE_KEY, JSON.stringify({ tabId, expiresAt: now + LEASE_MS }));
        isLeader = readLease()?.tabId === tabId;
      } else isLeader = false;
      return isLeader;
    };
    const releaseLease = () => {
      if (readLease()?.tabId === tabId) localStorage.removeItem(LEASE_KEY);
    };
    const markActivity = () => { lastActivityAt = Date.now(); };
    const status = (now) => document.hidden ? 'hidden' : now - lastActivityAt > USER_ACTIVITY_IDLE_MS ? 'idle' : 'active';

    const upload = async (final = false) => {
      const activeSeconds = Math.floor(activeMs / 1000);
      if (!initialized || uploadPending || !isLeader || uploadedSeconds === activeSeconds && !final) return;
      uploadPending = true;
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id !== user.id) return;
        const now = new Date();
        const payload = { schemaVersion: 1, userId: user.id, sessionId, startedAt,
          lastSeenAt: now.toISOString(), activeSeconds, activeMinutes: Number((activeSeconds / 60).toFixed(2)),
          lastActivityAt: new Date(lastActivityAt).toISOString(), sessionCount,
          status: final ? 'ended' : status(now.getTime()),
          lastPath: pathRef.current || '/', source: 'web' };
        const result = await uploadActivityLog(logPath, payload);
        if (result.success) { uploadedSeconds = activeSeconds; lastUploadAt = now.getTime(); }
      } catch { /* Logging must never interrupt learning. */ }
      finally { uploadPending = false; }
    };

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.min(TICK_MS, Math.max(0, now - lastTickAt));
      lastTickAt = now;
      if (!claimLease()) return;
      if (!document.hidden && now - lastActivityAt <= USER_ACTIVITY_IDLE_MS) activeMs += elapsed;
      if (now - lastUploadAt >= UPLOAD_MS) void upload();
    };
    const onVisibility = () => {
      lastTickAt = Date.now();
      if (document.hidden) void upload();
      else markActivity();
    };
    const onPageHide = () => { stopped = true; void upload(true); releaseLease(); };
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    claimLease();
    void (async () => {
      const existing = await fetchActivityLog(logPath);
      if (stopped) return;
      const previousSeconds = existing?.activeSeconds || 0;
      activeMs = previousSeconds * 1000;
      uploadedSeconds = previousSeconds;
      sessionCount = Math.max(0, Math.floor(Number(existing?.sessionCount) || 0)) + 1;
      initialized = true;
      if (isLeader) void upload();
    })();
    const timer = window.setInterval(() => { if (!stopped) tick(); }, TICK_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      void upload(true);
      releaseLease();
    };
  }, [user?.id, user?.isDemo]);
}
