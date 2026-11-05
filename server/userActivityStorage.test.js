import test from 'node:test';
import assert from 'node:assert/strict';
import { activityLogPath, normalizeActivityLog, summarizeActivityLogs, vietnamDateKey } from '../src/lib/userActivityStorage.js';
import { canOwnActivityLease } from '../src/lib/useUserActivityTimer.js';

test('activity paths keep logs under the requested private folder', () => {
  const date = new Date('2026-11-05T18:00:00Z');
  assert.equal(vietnamDateKey(date), '2026-11-06');
  assert.equal(activityLogPath('user-123', date),
    'log user and timer/user-123/2026-11-06/usage.json');
  assert.throws(() => activityLogPath('', date));
});

test('activity summary aggregates sessions per user and detects recent users', () => {
  const now = new Date('2026-11-06T04:00:00Z');
  const base = { schemaVersion: 1, startedAt: '2026-11-06T02:00:00Z', lastPath: '/roadmap' };
  const summary = summarizeActivityLogs([
    { ...base, userId: 'a', sessionId: 'a1', sessionCount: 2, activeSeconds: 150, lastSeenAt: '2026-11-06T03:59:00Z' },
    { ...base, userId: 'b', sessionId: 'b1', activeSeconds: 30, lastSeenAt: '2026-11-06T03:00:00Z' },
    { bad: true },
  ], now);
  assert.equal(summary.uniqueUsers, 2);
  assert.equal(summary.onlineUsers, 1);
  assert.equal(summary.activeSeconds, 180);
  assert.equal(summary.sessions, 3);
  assert.equal(summary.users[0].userId, 'a');
});

test('only one active tab can own the timer lease', () => {
  assert.equal(canOwnActivityLease(null, 'tab-a', 100), true);
  assert.equal(canOwnActivityLease({ tabId: 'tab-a', expiresAt: 200 }, 'tab-a', 100), true);
  assert.equal(canOwnActivityLease({ tabId: 'tab-a', expiresAt: 200 }, 'tab-b', 100), false);
  assert.equal(canOwnActivityLease({ tabId: 'tab-a', expiresAt: 100 }, 'tab-b', 100), true);
});

test('normalization rejects malformed logs and clamps negative time', () => {
  assert.equal(normalizeActivityLog({}), null);
  assert.equal(normalizeActivityLog({ userId: 'a', sessionId: 's', lastSeenAt: 'bad' }), null);
  assert.equal(normalizeActivityLog({ userId: 'a', sessionId: 's', lastSeenAt: '2026-11-06T00:00:00Z', activeSeconds: -9 }).activeSeconds, 0);
});
