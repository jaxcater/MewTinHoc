// Chỉ hai loại bài đã nộp này mới được ghi nhận ngày học.
export function qualifiesForStudyStreak(source, score, maxScore) {
  return (source === 'roadmap' || source === 'exam')
    && Number.isFinite(score) && Number.isFinite(maxScore)
    && maxScore > 0 && score > maxScore * 0.1 && score <= maxScore;
}

export function nextStudyStreak(count, dayDiff, graceDays) {
  return dayDiff >= 1 && dayDiff <= graceDays ? count + 1 : 1;
}

// Lịch sử ngày học không bị mất khi bộ đếm cũ bị ghi đè về 0.
export function resolveStudyStreak(progress, history, today, graceDays = 3) {
  const dayNumber = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
    const number = Date.parse(`${value}T00:00:00Z`) / 86400000;
    return Number.isFinite(number) ? number : NaN;
  };
  const todayNumber = dayNumber(today);
  const dates = [...new Set(Array.isArray(history) ? history : [])]
    .filter(date => Number.isFinite(dayNumber(date)) && dayNumber(date) <= todayNumber)
    .sort().reverse();
  let count = dates.length ? 1 : 0;
  for (let i = 1; i < dates.length; i += 1) {
    if (dayNumber(dates[i - 1]) - dayNumber(dates[i]) > graceDays) break;
    count += 1;
  }
  let lastDate = dates[0] || null;
  const storedDate = progress.streak_last_date;
  if (Number.isFinite(dayNumber(storedDate)) && dayNumber(storedDate) <= todayNumber) {
    if (!lastDate || storedDate > lastDate) {
      // Bài vừa nộp có thể chưa xuất hiện trong lịch sử Realtime.
      const gap = dayNumber(storedDate) - dayNumber(lastDate);
      count = Math.max(Number(progress.streak_count) || 0,
        gap >= 1 && gap <= graceDays ? count + 1 : 1);
      lastDate = storedDate;
    } else if (storedDate === lastDate) {
      count = Math.max(count, Number(progress.streak_count) || 0);
    }
  }
  if (!lastDate || todayNumber - dayNumber(lastDate) > graceDays) count = 0;
  return { ...progress, streak_count: count, streak_last_date: lastDate };
}
