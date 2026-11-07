// Chỉ hai loại bài đã nộp này mới được ghi nhận ngày học.
export function qualifiesForStudyStreak(source, score, maxScore) {
  return (source === 'roadmap' || source === 'exam')
    && Number.isFinite(score) && Number.isFinite(maxScore)
    && maxScore > 0 && score > maxScore * 0.1 && score <= maxScore;
}

export function nextStudyStreak(count, dayDiff, graceDays) {
  return dayDiff >= 1 && dayDiff <= graceDays ? count + 1 : 1;
}
