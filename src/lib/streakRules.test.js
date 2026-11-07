import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifiesForStudyStreak, nextStudyStreak, resolveStudyStreak } from './streakRules.js';

test('cả hai luồng chỉ nhận điểm lớn hơn 10%, không cần đạt 80%', () => {
  for (const source of ['roadmap', 'exam']) {
    assert.equal(qualifiesForStudyStreak(source, 0, 10), false);
    assert.equal(qualifiesForStudyStreak(source, 0.99, 10), false);
    assert.equal(qualifiesForStudyStreak(source, 1, 10), false);
    assert.equal(qualifiesForStudyStreak(source, 1.01, 10), true);
    assert.equal(qualifiesForStudyStreak(source, 7.9, 10), true);
    assert.equal(qualifiesForStudyStreak(source, 10, 10), true);
  }
});

test('dùng điểm gốc của quiz để không làm tròn mất ngưỡng 10%', () => {
  assert.equal(qualifiesForStudyStreak('roadmap', 1, 10), false);
  assert.equal(qualifiesForStudyStreak('roadmap', 10, 99), true);
  assert.equal(qualifiesForStudyStreak('roadmap', 9, 100), false);
});

test('không nhận nguồn điểm danh thủ công hay kết quả không hợp lệ', () => {
  for (const source of ['checkin', 'lesson', '', null, undefined]) {
    assert.equal(qualifiesForStudyStreak(source, 9, 10), false);
  }
  for (const [score, max] of [[NaN, 10], [Infinity, 10], [5, 0], [5, -10], [11, 10], ['5', 10], [1, NaN]]) {
    assert.equal(qualifiesForStudyStreak('exam', score, max), false);
  }
});

test('giữ ân hạn hai ngày nghỉ, bắt đầu lại sau ba ngày trống', () => {
  assert.equal(nextStudyStreak(7, 1, 3), 8);
  assert.equal(nextStudyStreak(7, 3, 3), 8);
  assert.equal(nextStudyStreak(7, 4, 3), 1);
  assert.equal(nextStudyStreak(0, 999, 3), 1);
  assert.equal(nextStudyStreak(7, -1, 3), 1);
});

test('phục hồi bộ đếm 0 khi hôm nay và lịch sử vẫn còn', () => {
  const result = resolveStudyStreak({ streak_count: 0, streak_last_date: '2026-11-07' },
    ['2026-11-07', '2026-11-06', '2026-11-05', '2026-11-04', '2026-11-03', '2026-11-02'], '2026-11-07');
  assert.equal(result.streak_count, 6);
  assert.equal(result.streak_last_date, '2026-11-07');
});

test('cache ngày cũ không làm mất ngày mới trong lịch sử', () => {
  const result = resolveStudyStreak({ streak_count: 20, streak_last_date: '2026-10-01' },
    ['2026-11-06', '2026-11-07', '2026-11-07'], '2026-11-07');
  assert.equal(result.streak_count, 2);
  assert.equal(result.streak_last_date, '2026-11-07');
});

test('ân hạn, đứt chuỗi và bắt đầu chuỗi mới dựa vào lịch sử', () => {
  const progress = { streak_count: 0, streak_last_date: null };
  const history = ['2026-11-01', '2026-11-04'];
  assert.equal(resolveStudyStreak(progress, history, '2026-11-07').streak_count, 2);
  assert.equal(resolveStudyStreak(progress, history, '2026-11-08').streak_count, 0);
  assert.equal(resolveStudyStreak(progress, [...history, '2026-11-08'], '2026-11-08').streak_count, 1);
  assert.equal(progress.streak_count, 0);
});

test('chuỗi dài hơn 30 ngày, trùng ngày, ngày tương lai và dữ liệu lỗi', () => {
  const dates = Array.from({ length: 120 }, (_, i) =>
    new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10));
  const result = resolveStudyStreak({ streak_count: 0 }, [...dates, dates[0], null, 'bad', '2027-01-01'], dates.at(-1));
  assert.equal(result.streak_count, 120);
  assert.equal(result.streak_last_date, dates.at(-1));
});

test('giữ bộ đếm cũ khi lịch sử chưa tải xong và nhận bài vừa nộp', () => {
  assert.equal(resolveStudyStreak({ streak_count: 90, streak_last_date: '2026-11-07' }, [], '2026-11-07').streak_count, 90);
  assert.equal(resolveStudyStreak({ streak_count: 0, streak_last_date: '2026-11-07' }, ['2026-11-06'], '2026-11-07').streak_count, 2);
  assert.equal(resolveStudyStreak({ streak_count: 0 }, [], '2026-11-07').streak_count, 0);
});
