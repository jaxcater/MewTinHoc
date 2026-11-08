import test from 'node:test';
import assert from 'node:assert/strict';
import { LEADERBOARD_PAGE_SIZE, parseLeaderboard, getGoogleAvatarUrl, getOvertakeGap } from '../src/lib/leaderboardModel.js';

const row = (id, xp, rank, mine = false) => ({ id, xp, rank, display_name: `Học viên ${id}`, is_current_user: mine });
const snapshot = (entries, overrides = {}) => ({ entries, top: entries.slice(0, 5), self: null,
  next_xp: null, total: entries.length, offset: 0, limit: 10, updated_at: '2026-11-09T03:00:00Z', ...overrides });

test('29 học viên chia thành 10, 10, 9 hàng; giữ hạng toàn cục qua ba trang', () => {
  assert.equal(LEADERBOARD_PAGE_SIZE, 10);
  const all = Array.from({ length: 29 }, (_, index) => row(`id-${index}`, 2900 - index * 100, index + 1));
  const pages = [0, 10, 20].map(offset => parseLeaderboard(snapshot(all.slice(offset, offset + LEADERBOARD_PAGE_SIZE), {
    top: all.slice(0, 5), total: all.length, offset
  })));
  assert.deepEqual(pages.map(page => page.entries.length), [10, 10, 9]);
  assert.deepEqual(pages.map(page => page.entries[0].rank), [1, 11, 21]);
  assert.equal(new Set(pages.flatMap(page => page.entries.map(entry => entry.id))).size, 29);
});

test('đồng EXP giữ hạng 1, 1, 3; không sửa thứ tự từ database', () => {
  const rows = [row('a', 900, 1), row('b', 900, 1), row('c', 700, 3, true)];
  const board = parseLeaderboard(snapshot(rows, { self: rows[2], next_xp: 900 }));
  assert.deepEqual(board.entries.map(entry => entry.rank), [1, 1, 3]);
  assert.equal(getOvertakeGap(board), 201);
});

test('phân trang có đồng hạng qua ranh giới và cá nhân ngoài trang', () => {
  const top = [row('a', 900, 1), row('b', 800, 2), row('c', 800, 2), row('d', 600, 4), row('e', 500, 5)];
  const board = parseLeaderboard(snapshot([top[2], top[3]], { top, total: 6, offset: 2, limit: 2,
    self: row('f', 100, 6, true), next_xp: 500 }));
  assert.equal(board.entries[0].rank, 2);
  assert.equal(board.self.rank, 6);
  assert.equal(getOvertakeGap(board), 401);
});

test('chưa có EXP không tạo thứ hạng giả; bảng rỗng và người dẫn đầu', () => {
  assert.equal(parseLeaderboard(snapshot([])).total, 0);
  assert.equal(getOvertakeGap(parseLeaderboard(snapshot([]))), null);
  assert.equal(getOvertakeGap(parseLeaderboard(snapshot([row('a', 50, 1)], { next_xp: 50 }))), 51);
  const winner = row('a', 50, 1, true);
  assert.equal(getOvertakeGap(parseLeaderboard(snapshot([winner], { self: winner }))), null);
});

test('từ chối EXP sai kiểu, âm, không nguyên và vượt độ chính xác JS', () => {
  for (const xp of [-1, 0, 1.5, NaN, Infinity, null, true, '', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parseLeaderboard(snapshot([row('a', xp, 1)])), /Invalid/);
  }
  assert.equal(parseLeaderboard(snapshot([row('a', '300', '1')])).entries[0].xp, 300);
});

test('từ chối trùng người, sai thứ tự, sai đồng hạng và hạng giảm', () => {
  for (const rows of [[row('a', 20, 1), row('a', 10, 2)], [row('a', 10, 1), row('b', 20, 2)],
    [row('a', 20, 1), row('b', 20, 2)], [row('a', 20, 1), row('b', 10, 1)]]) {
    assert.throws(() => parseLeaderboard(snapshot(rows)), /Invalid/);
  }
});

test('không hiển thị email đầy đủ; giữ nguyên văn bản để React escape', () => {
  const entry = { ...row('a', 30, 1), display_name: ' learner@example.com ' };
  assert.equal(parseLeaderboard(snapshot([entry])).entries[0].name, 'learner');
  entry.display_name = '<img src=x onerror=alert(1)>';
  assert.equal(parseLeaderboard(snapshot([entry])).entries[0].name, entry.display_name);
});

test('giữ avatar Google của từng học viên trong danh sách, top và vị trí cá nhân', () => {
  const entry = { ...row('a', 30, 1, true), avatar_url: 'https://lh3.googleusercontent.com/a/avatar=s96-c' };
  const board = parseLeaderboard(snapshot([entry], { self: entry }));
  assert.equal(board.entries[0].avatarUrl, entry.avatar_url);
  assert.equal(board.top[0].avatarUrl, entry.avatar_url);
  assert.equal(board.self.avatarUrl, entry.avatar_url);
  assert.equal(parseLeaderboard(snapshot([row('b', 20, 1)])).entries[0].avatarUrl, null);
});

test('chỉ nhận URL HTTPS ảnh Google, bỏ qua URL hỏng và tên miền giả', () => {
  for (const value of [undefined, null, '', {}, 'not a URL', 'javascript:alert(1)',
    'http://lh3.googleusercontent.com/a/photo', 'https://googleusercontent.com.evil.test/photo',
    'https://evilgoogleusercontent.com/photo', 'https://user@lh3.googleusercontent.com/photo',
    'https://lh3.googleusercontent.com:8443/photo']) {
    assert.equal(getGoogleAvatarUrl(value), null);
  }
  assert.equal(getGoogleAvatarUrl(' https://lh3.googleusercontent.com/a/photo '), 'https://lh3.googleusercontent.com/a/photo');
});

test('từ chối snapshot thiếu hàng, sai thời gian, sai vị trí cá nhân và sai mục tiêu', () => {
  const rows = [row('a', 40, 1)];
  for (const change of [{ total: null }, { limit: 0 }, { total: 2 }, { updated_at: 'bad' },
    { self: row('a', 40, 1) }, { self: row('a', 40, 2, true) }, { next_xp: 0 }]) {
    assert.throws(() => parseLeaderboard(snapshot(rows, change)));
  }
});
