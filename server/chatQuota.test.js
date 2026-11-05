import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createChatQuota } from './chatQuota.js';

function fixture(t, start = '2026-11-04T12:00:00Z') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mew-chat-quota-'));
  let time = Date.parse(start);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { directory, quota: createChatQuota(directory, () => time),
    clock: () => time, setTime: (value) => { time = Date.parse(value); } };
}

test('allows five messages and blocks the sixth without increasing usage', (t) => {
  const { quota } = fixture(t);
  assert.equal(quota.status('student').remaining, 5);
  for (let i = 1; i <= 5; i += 1) {
    const result = quota.consume('student');
    assert.equal(result.allowed, true);
    assert.equal(result.quota.remaining, 5 - i);
  }
  assert.equal(quota.consume('student').allowed, false);
  assert.equal(quota.status('student').used, 5);
});

test('quota survives service recreation and remains separate for each account', (t) => {
  const { quota, directory, clock } = fixture(t);
  quota.consume('student-a');
  const restarted = createChatQuota(directory, clock);
  assert.equal(restarted.status('student-a').remaining, 4);
  assert.equal(restarted.status('student-b').remaining, 5);
});

test('resets exactly at midnight Vietnam time rather than UTC midnight', (t) => {
  const { quota, setTime } = fixture(t, '2026-11-04T16:59:59.999Z');
  for (let i = 0; i < 5; i += 1) quota.consume('student');
  assert.equal(quota.status('student').resetAt, '2026-11-04T17:00:00.000Z');
  assert.equal(quota.consume('student').allowed, false);
  setTime('2026-11-04T17:00:00.000Z');
  assert.equal(quota.status('student').remaining, 5);
  assert.equal(quota.consume('student').allowed, true);
  setTime('2026-11-05T00:00:00.000Z');
  assert.equal(quota.status('student').remaining, 4);
});

test('back-to-back requests share one reservation count', async (t) => {
  const { quota } = fixture(t);
  const results = await Promise.all(Array.from({ length: 12 }, () =>
    Promise.resolve().then(() => quota.consume('student'))));
  assert.equal(results.filter((result) => result.allowed).length, 5);
  assert.equal(quota.status('student').remaining, 0);
});

test('verified admins can exceed five messages without reading or changing quota files', (t) => {
  const { quota, directory } = fixture(t);
  for (let i = 0; i < 5; i += 1) quota.consume('admin');
  const before = fs.readdirSync(directory).map((file) => fs.readFileSync(path.join(directory, file), 'utf8'));
  for (let i = 0; i < 12; i += 1) {
    const result = quota.consume('admin', { isAdmin: true });
    assert.equal(result.allowed, true);
    assert.equal(result.quota.unlimited, true);
    assert.equal(result.quota.remaining, null);
  }
  assert.equal(quota.status('admin', { isAdmin: true }).limit, null);
  assert.deepEqual(fs.readdirSync(directory).map((file) => fs.readFileSync(path.join(directory, file), 'utf8')), before);
  // Revoking admin immediately restores the existing ordinary quota.
  assert.equal(quota.consume('admin', { isAdmin: false }).allowed, false);
  assert.equal(quota.consume('admin', { isAdmin: 'true' }).allowed, false);
});
