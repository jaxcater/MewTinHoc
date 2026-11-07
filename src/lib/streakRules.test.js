import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifiesForStudyStreak, nextStudyStreak } from './streakRules.js';

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
