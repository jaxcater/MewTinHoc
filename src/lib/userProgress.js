import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { getEvolutionByDays, getEvolutionProgress } from './streakEvolutions';
import { qualifiesForStudyStreak, nextStudyStreak } from './streakRules';

// Khối kiến thức chuẩn trong ma trận Bộ GD&ĐT
export const MASTERY_BLOCKS = {
  PYTHON: 'python',
  SQL: 'sql',
  NETWORK: 'network',
  SAFETY: 'safety'
};

export const MASTERY_META = {
  python: { label: 'Lập trình & Thuật toán Python', color: 'var(--color-primary)', defaultProgress: 88 },
  sql: { label: 'Cơ sở dữ liệu & SQL', color: '#D97706', defaultProgress: 65 },
  network: { label: 'Mạng Máy Tính & Internet', color: 'var(--color-deep)', defaultProgress: 45 },
  safety: { label: 'An toàn số & Đạo đức ICT', color: '#16A34A', defaultProgress: 80 }
};

const DEFAULT_PROGRESS = {
  streak_count: 0, // Mới tạo tài khoản bắt đầu từ 0 ngày
  streak_last_date: null,
  total_exams: 0,
  avg_score: 0,
  accuracy: 0,
  xp_total: 0
};

const DEFAULT_MASTERY = {
  python: 0,
  sql: 0,
  network: 0,
  safety: 0
};

/**
 * Quy tắc Streak: khoảng cách TỐI ĐA giữa hai lần điểm danh là 3 NGÀY.
 * - Cách nhau 1..3 ngày (nghỉ 0..2 ngày trắng): chuỗi vẫn giữ, điểm danh lại vẫn +1.
 * - Để trống đủ 3 ngày liên tiếp (tức cách nhau 4 ngày): MẤT streak, trở về 0.
 * Đây là NGUỒN DUY NHẤT cho cả logic lẫn phần chữ hiển thị.
 */
export const STREAK_GRACE_DAYS = 3;

// Helper: định dạng một đối tượng Date thành 'YYYY-MM-DD' theo GIỜ ĐỊA PHƯƠNG.
// Không dùng toISOString() vì hàm đó quy đổi sang UTC -> bị lệch 1 ngày vào
// khoảng 00:00-06:59 giờ Việt Nam (UTC+7).
export const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: lấy ngày hôm nay (hoặc ngày đã dịch bởi dayOffset) theo giờ địa phương
export const getEffectiveDate = (dayOffset = 0) => {
  const d = new Date();
  if (dayOffset !== 0) {
    d.setDate(d.getDate() + dayOffset);
  }
  return formatLocalDate(d);
};

// Helper: quy đổi 'YYYY-MM-DD' thành số ngày tuyệt đối (múi giờ độc lập)
const toDayNumber = (dateStr) => {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

/**
 * Helper: khoảng cách ngày CÓ DẤU giữa 2 chuỗi 'YYYY-MM-DD'.
 * - > 0 : dateStr2 ở tương lai so với dateStr1 (bình thường là 1)
 * - = 0 : cùng ngày
 * - < 0 : dateStr2 ở quá khứ (dữ liệu cũ / đồng hồ lệch)
 * Trả về 999 nếu thiếu dữ liệu.
 */
export const getDayDiff = (dateStr1, dateStr2) => {
  if (!dateStr1 || !dateStr2) return 999;
  const n1 = toDayNumber(dateStr1);
  const n2 = toDayNumber(dateStr2);
  if (Number.isNaN(n1) || Number.isNaN(n2)) return 999;
  return n2 - n1;
};

/**
 * Hook quản lý toàn bộ User Progress với Supabase Database + Realtime & LocalStorage Fallback
 */
export function useUserProgress(user) {
  const userId = user?.id || 'guest';
  const isDemo = user?.isDemo === true;
  const storage = isDemo ? sessionStorage : localStorage;
  const progressKey = `tinhoc_user_progress_${userId}`;
  const masteryKey = `tinhoc_mastery_progress_${userId}`;
  const lessonsKey = `tinhoc_completed_lessons_${userId}`;
  const checkinKey = `tinhoc_checkin_history_${userId}`;

  // Chế độ MÔ PHỎNG NGÀY chỉ tồn tại trong phiên làm việc hiện tại.
  // Cố ý KHÔNG lưu vào localStorage để khi F5 luôn quay về ngày thật.
  const [dayOffset, setDayOffset] = useState(0);
  const [hydratedUserId, setHydratedUserId] = useState(userId);
  const currentUserIdRef = useRef(userId);
  const loadRequestIdRef = useRef(0);

  const effectiveToday = getEffectiveDate(dayOffset);
  const isSimulating = dayOffset !== 0;

  // 1. Tiến độ tổng quan (Streak bắt đầu từ 0 ngày khi tạo tài khoản)
  const [progress, setProgress] = useState(() => {
    try {
      const saved = storage.getItem(progressKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Xóa giá trị mock 7 hoặc 8 cũ nếu tài khoản chưa từng điểm danh thực tế
        if (!parsed.streak_last_date && parsed.streak_count > 0) {
          parsed.streak_count = 0;
        }
        return parsed;
      }
    } catch {}
    return { ...DEFAULT_PROGRESS };
  });

  // 2. Mức độ làm chủ 4 khối
  const [mastery, setMastery] = useState(() => {
    try {
      const saved = storage.getItem(masteryKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...DEFAULT_MASTERY };
  });

  // 3. Danh sách bài học hoàn thành trong lộ trình
  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      const saved = storage.getItem(lessonsKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // 4. Lịch sử các ngày đã điểm danh
  const [checkinHistory, setCheckinHistory] = useState(() => {
    try {
      const saved = storage.getItem(checkinKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Reset/reload khi user đăng nhập tài khoản khác
  useEffect(() => {
    currentUserIdRef.current = userId;
    loadRequestIdRef.current += 1;
    setHydratedUserId(null);
    setDayOffset(0);
    try {
      const saved = storage.getItem(progressKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.streak_last_date && parsed.streak_count > 0) {
          parsed.streak_count = 0;
        }
        setProgress(parsed);
      } else {
        setProgress({ ...DEFAULT_PROGRESS });
      }
    } catch {
      setProgress({ ...DEFAULT_PROGRESS });
    }

    try {
      const savedMastery = storage.getItem(masteryKey);
      setMastery(savedMastery ? JSON.parse(savedMastery) : { ...DEFAULT_MASTERY });
    } catch {
      setMastery({ ...DEFAULT_MASTERY });
    }

    try {
      const savedLessons = storage.getItem(lessonsKey);
      setCompletedLessons(savedLessons ? JSON.parse(savedLessons) : {});
    } catch {
      setCompletedLessons({});
    }

    try {
      const savedHist = storage.getItem(checkinKey);
      setCheckinHistory(savedHist ? JSON.parse(savedHist) : []);
    } catch {
      setCheckinHistory([]);
    }
    setHydratedUserId(userId);
  }, [userId, progressKey, masteryKey, lessonsKey, checkinKey]);


  // Trạng thái kết nối DB: 'checking' | 'connected' | 'fallback'
  const [dbStatus, setDbStatus] = useState('checking');
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const realtimeChannelRef = useRef(null);
  const progressRef = useRef(progress);
  useLayoutEffect(() => { progressRef.current = progress; }, [progress]);
  const [studyReward, setStudyReward] = useState(null);
  const progressWriteRef = useRef(Promise.resolve());

  // Ghi tuần tự để XP của bài nộp, ngày học và hoàn thành chủ đề không ghi đè nhau.
  const persistProgress = useCallback((fields) => {
    if (isSimulating || isDemo || userId === 'guest' || !supabase) return Promise.resolve();
    const targetUserId = userId;
    progressWriteRef.current = progressWriteRef.current.catch(() => {}).then(async () => {
      const { error } = await supabase.from('user_progress').upsert({
        id: targetUserId, ...fields, updated_at: new Date().toISOString()
      });
      if (error) console.warn('Chưa đồng bộ được tiến độ (đã lưu offline):', error.message);
    }).catch((error) => console.warn('Lỗi đồng bộ tiến độ:', error?.message));
    return progressWriteRef.current;
  }, [isSimulating, isDemo, userId]);

  // Tính checkedToday theo effectiveToday
  const checkedToday = progress.streak_last_date === effectiveToday;

  // Dọn khoá mô phỏng cũ (nếu phiên bản trước đã lỡ lưu) để F5 luôn về ngày thật
  useEffect(() => {
    try {
      storage.removeItem('tinhoc_day_offset');
    } catch { /* ignore */ }
  }, []);

  // TỰ ĐỘNG HẾT HẠN STREAK: nếu đã bỏ lỡ >= 2 ngày thì chuỗi về 0.
  // Chỉ chạy với ngày THỰC (bỏ qua khi đang mô phỏng) để không đụng dữ liệu Supabase.
  const lastExpiredRef = useRef(null);
  useEffect(() => {
    if (isSimulating) return;

    const last = progress.streak_last_date;
    if (!last) return;

    const diff = getDayDiff(last, effectiveToday);
    // Còn trong thời gian ân hạn -> chuỗi chưa đứt, không làm gì cả.
    if (diff <= STREAK_GRACE_DAYS) return;

    const count = progress.streak_count || 0;

    // Chỉ cần ghi Supabase 1 lần cho mỗi cặp (ngày điểm danh cuối, số streak)
    const signature = `${last}|${count}`;
    if (lastExpiredRef.current === signature) return;
    lastExpiredRef.current = signature;

    if (count > 0) {
      setProgress(prev => ({ ...prev, streak_count: 0 }));

      if (!isDemo && user?.id && supabase) {
        supabase
          .from('user_progress')
          .upsert({ id: user.id, streak_count: 0, updated_at: new Date().toISOString() })
          .then(() => {}, (e) => console.warn('Lỗi đồng bộ streak hết hạn:', e?.message));
      }
    }
  }, [isSimulating, progress.streak_last_date, progress.streak_count, effectiveToday, user?.id]);
  // Lưu cache LocalStorage mỗi khi state đổi — nhưng BỎ QUA khi đang mô phỏng,
  // để dữ liệu giả không dính vào bộ nhớ trình duyệt và sống sót qua F5.
  useEffect(() => {
    if (isSimulating || hydratedUserId !== userId) return;

    storage.setItem(progressKey, JSON.stringify(progress));
    storage.setItem(`tinhoc_streak_${userId}`, JSON.stringify({
      count: progress.streak_count,
      checkedToday: progress.streak_last_date === effectiveToday,
      lastCheckInDate: progress.streak_last_date,
      dayOffset,
      checkinHistory
    }));
  }, [progress, effectiveToday, dayOffset, progressKey, checkinHistory, isSimulating, hydratedUserId, userId]);

  useEffect(() => {
    if (hydratedUserId !== userId) return;
    storage.setItem(masteryKey, JSON.stringify(mastery));
  }, [mastery, masteryKey, hydratedUserId, userId]);

  useEffect(() => {
    if (hydratedUserId !== userId) return;
    storage.setItem(lessonsKey, JSON.stringify(completedLessons));
  }, [completedLessons, lessonsKey, hydratedUserId, userId]);

  useEffect(() => {
    if (isSimulating || hydratedUserId !== userId) return;

    storage.setItem(checkinKey, JSON.stringify(checkinHistory));
  }, [checkinHistory, checkinKey, isSimulating, hydratedUserId, userId]);


  // Tải dữ liệu ban đầu từ Supabase (nếu user đăng nhập)
  const loadUserDataFromSupabase = useCallback(async (targetUserId) => {
    if (isDemo || !targetUserId || !supabase) {
      setDbStatus('fallback');
      return;
    }

    const targetProgressKey = `tinhoc_user_progress_${targetUserId}`;
    const targetMasteryKey = `tinhoc_mastery_progress_${targetUserId}`;
    const targetLessonsKey = `tinhoc_completed_lessons_${targetUserId}`;
    const targetCheckinKey = `tinhoc_checkin_history_${targetUserId}`;
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const isCurrentUser = () => currentUserIdRef.current === targetUserId && loadRequestIdRef.current === requestId;

    try {
      // 1. Tải user_progress
      const { data: progData, error: progErr } = await supabase
        .from('user_progress')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (progErr) {
        // Có thể bảng chưa được tạo trên Supabase -> fallback
        console.warn('Supabase user_progress warning:', progErr.message);
        setDbStatus('fallback');
        return;
      }

      if (!isCurrentUser()) return;
      setDbStatus('connected');

      if (progData) {
        const loadedProgress = {
          ...DEFAULT_PROGRESS,
          streak_count: progData.streak_count ?? 0,
          streak_last_date: progData.streak_last_date ?? null,
          total_exams: progData.total_exams ?? 0,
          avg_score: progData.avg_score != null ? parseFloat(progData.avg_score) : 0,
          accuracy: progData.accuracy != null ? parseFloat(progData.accuracy) : 0,
          xp_total: progData.xp_total ?? 0
        };
        setProgress(loadedProgress);
        storage.setItem(targetProgressKey, JSON.stringify(loadedProgress));
      } else {
        // Người dùng mới -> tự tạo dòng mặc định
        if (isCurrentUser()) {
          const { error: seedProgErr } = await supabase.from('user_progress').upsert({
            id: targetUserId,
            streak_count: DEFAULT_PROGRESS.streak_count,
            streak_last_date: null,
            total_exams: DEFAULT_PROGRESS.total_exams,
            avg_score: DEFAULT_PROGRESS.avg_score,
            accuracy: DEFAULT_PROGRESS.accuracy,
            xp_total: DEFAULT_PROGRESS.xp_total
          });
          if (seedProgErr) console.warn('Không tạo được user_progress mặc định:', seedProgErr.message);
        }
      }

      // 2. Tải mastery_progress
      const { data: mastData, error: mastErr } = await supabase
        .from('mastery_progress')
        .select('block_key, progress')
        .eq('user_id', targetUserId);

      if (!mastErr && isCurrentUser()) {
        const loadedMastery = { ...DEFAULT_MASTERY };
        (mastData || []).forEach(row => {
          if (row.block_key) loadedMastery[row.block_key] = row.progress;
        });
        setMastery(loadedMastery);
        storage.setItem(targetMasteryKey, JSON.stringify(loadedMastery));
      }

      // 3. Tải roadmap_lessons
      const { data: lessonData, error: lessonErr } = await supabase
        .from('roadmap_lessons')
        .select('lesson_id, completed')
        .eq('user_id', targetUserId);

      if (!lessonErr && lessonData && isCurrentUser()) {
        const loadedLessons = {};
        lessonData.forEach(row => {
          if (row.lesson_id) loadedLessons[row.lesson_id] = !!row.completed;
        });
        setCompletedLessons(loadedLessons);
        storage.setItem(targetLessonsKey, JSON.stringify(loadedLessons));
      }

      // 4. Tải daily_checkins
      const { data: checkinData, error: checkinErr } = await supabase
        .from('daily_checkins')
        .select('checkin_date')
        .eq('user_id', targetUserId)
        .order('checkin_date', { ascending: false })
        .limit(30);

      if (!checkinErr && checkinData && isCurrentUser()) {
        const loadedCheckins = checkinData.map(r => r.checkin_date);
        setCheckinHistory(loadedCheckins);
        storage.setItem(targetCheckinKey, JSON.stringify(loadedCheckins));
      }

    } catch (err) {
      console.warn('Lỗi kết nối Supabase, chuyển sang Offline LocalStorage:', err);
      if (isCurrentUser()) setDbStatus('fallback');
    }
  }, [loadRequestIdRef, isDemo]);

  // Thiết lập Supabase Realtime Subscription
  useEffect(() => {
    const userId = user?.id;
    if (isDemo || !userId || !supabase) {
      setDbStatus('fallback');
      setIsRealtimeActive(false);
      return;
    }

    loadUserDataFromSupabase(userId);

    // Dọn dẹp subscription cũ
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    try {
      const channel = supabase
        .channel(`realtime:user_progress:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_progress', filter: `id=eq.${userId}` },
          (payload) => {
            if (payload.new) {
              setProgress(prev => ({
                ...prev,
                streak_count: payload.new.streak_count ?? prev.streak_count,
                streak_last_date: payload.new.streak_last_date ?? prev.streak_last_date,
                total_exams: payload.new.total_exams ?? prev.total_exams,
                avg_score: payload.new.avg_score != null ? parseFloat(payload.new.avg_score) : prev.avg_score,
                accuracy: payload.new.accuracy != null ? parseFloat(payload.new.accuracy) : prev.accuracy,
                xp_total: payload.new.xp_total ?? prev.xp_total
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mastery_progress', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.new && payload.new.block_key) {
              setMastery(prev => ({
                ...prev,
                [payload.new.block_key]: payload.new.progress
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'roadmap_lessons', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.new && payload.new.lesson_id) {
              setCompletedLessons(prev => ({
                ...prev,
                [payload.new.lesson_id]: !!payload.new.completed
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'daily_checkins', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new?.checkin_date) {
              setCheckinHistory(prev => {
                if (prev.includes(payload.new.checkin_date)) return prev;
                return [payload.new.checkin_date, ...prev];
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsRealtimeActive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsRealtimeActive(false);
          }
        });

      realtimeChannelRef.current = channel;
    } catch (e) {
      console.warn('Realtime subscription error:', e);
      setIsRealtimeActive(false);
    }

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [user?.id, isDemo, loadUserDataFromSupabase]);

  // Chỉ gọi sau khi bài kiểm tra hoặc đề thi thử đã được nộp và chấm xong.
  const recordStudySubmission = useCallback(async (source, score, maxScore) => {
    if (!qualifiesForStudyStreak(source, score, maxScore) || userId === 'guest' || isDemo || currentUserIdRef.current !== userId) {
      return { success: false };
    }
    // Lấy ngày ngay lúc nộp, kể cả khi học viên để trang mở qua nửa đêm.
    const today = getEffectiveDate(dayOffset);
    const current = progressRef.current;
    if (current.streak_last_date === today) {
      return { success: false, message: 'Hôm nay bạn đã điểm danh rồi!' };
    }

    const newStreak = nextStudyStreak(current.streak_count || 0,
      getDayDiff(current.streak_last_date, today), STREAK_GRACE_DAYS);
    const newXp = (current.xp_total || 0) + 50;

    // Cập nhật State tức thì (Optimistic UI) — luôn an toàn cho cả chế độ mô phỏng
    const updated = {
      ...current,
      streak_count: newStreak,
      streak_last_date: today,
      xp_total: newXp
    };
    // Khoá đồng bộ ngay trước mọi await, tránh hai bài nộp cùng ngày cộng hai lần.
    progressRef.current = updated;
    setProgress(updated);
    setStudyReward({ userId, date: today, count: newStreak, source });

    setCheckinHistory(prev => (prev.includes(today) ? prev : [today, ...prev]));
    const progressWrite = persistProgress({
      streak_count: newStreak, streak_last_date: today, xp_total: newXp
    });

    // Gửi lên Supabase — CHỈ khi dùng NGÀY THẬT.
    // Khi Admin đang mô phỏng ngày thì tuyệt đối không ghi ngày ảo vào CSDL.
    if (!isSimulating && !isDemo && userId !== 'guest' && supabase) {
      try {
        const { error } = await supabase.from('daily_checkins').upsert({
          user_id: userId,
          checkin_date: today
        }, { onConflict: 'user_id,checkin_date' });

        if (error) console.warn('Chưa đồng bộ được ngày học (đã lưu offline):', error.message);
      } catch (e) {
        console.warn('Lỗi ghi Supabase khi check-in (đã lưu offline):', e);
      }
    }
    await progressWrite;

    return {
      success: true,
      newStreak,
      message: `Đã ghi nhận ngày học! Chuỗi đạt ${newStreak} ngày (+50 XP).`
    };
  }, [dayOffset, userId, isDemo, isSimulating, persistProgress]);

  // Hành động: Cập nhật mức độ làm chủ khối kiến thức (hỗ trợ số hoặc function updater)
  const updateMastery = useCallback(async (blockKey, valOrFn) => {
    let resolvedValue;
    setMastery(prev => {
      const current = prev[blockKey] ?? DEFAULT_MASTERY[blockKey] ?? 50;
      const target = typeof valOrFn === 'function' ? valOrFn(current) : valOrFn;
      resolvedValue = Math.max(0, Math.min(100, Math.round(target)));
      return {
        ...prev,
        [blockKey]: resolvedValue
      };
    });

    if (!isDemo && user?.id && supabase && resolvedValue !== undefined) {
      try {
        await supabase.from('mastery_progress').upsert({
          user_id: user.id,
          block_key: blockKey,
          progress: resolvedValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,block_key' });
      } catch (e) {
        console.warn('Lỗi cập nhật mastery lên Supabase:', e);
      }
    }
  }, [user?.id]);


  // Hành động: Đánh dấu bài học hoàn thành trong lộ trình
  const toggleLesson = useCallback(async (lessonId, track = 'ict') => {
    const newStatus = !completedLessons[lessonId];

    setCompletedLessons(prev => ({
      ...prev,
      [lessonId]: newStatus
    }));

    // Thưởng XP khi hoàn thành bài
    if (newStatus) {
      const updated = { ...progressRef.current, xp_total: (progressRef.current.xp_total || 0) + 30 };
      progressRef.current = updated;
      setProgress(updated);
      void persistProgress({ xp_total: updated.xp_total });
    }

    if (!isDemo && userId !== 'guest' && supabase) {
      try {
        await supabase.from('roadmap_lessons').upsert({
          user_id: userId,
          track: track.toLowerCase(),
          lesson_id: lessonId,
          completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null
        }, { onConflict: 'user_id,track,lesson_id' });
      } catch (e) {
        console.warn('Lỗi ghi bài học lên Supabase:', e);
      }
    }

    return newStatus;
  }, [completedLessons, userId, isDemo, persistProgress]);

  // Hành động: Ghi nhận kết quả làm bài thi thử
  const recordExamResult = useCallback(async (score, accuracy, maxScore = 10) => {
    if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) return;
    // Cập nhật ngày học trước await để hai bài nộp không cộng trùng.
    const studyWrite = recordStudySubmission('exam', score, maxScore);
    const current = progressRef.current;
    const newTotal = (current.total_exams || 0) + 1;
    const updated = {
      ...current,
      total_exams: newTotal,
      avg_score: Number((((current.avg_score || 0) * (newTotal - 1) + score * 10 / maxScore) / newTotal).toFixed(2)),
      accuracy: Number.isFinite(accuracy) ? Number(accuracy.toFixed(1)) : current.accuracy,
      xp_total: (current.xp_total || 0) + 100
    };
    progressRef.current = updated;
    setProgress(updated);
    await Promise.all([studyWrite, persistProgress({
      total_exams: updated.total_exams,
      avg_score: updated.avg_score,
      accuracy: updated.accuracy,
      xp_total: updated.xp_total
    })]);
  }, [recordStudySubmission, persistProgress]);
  // Công cụ kiểm thử (CHỈ ADMIN): giả lập ngày mai.
  // Chỉ đổi state trong RAM, KHÔNG ghi gì lên Supabase.
  const simulateNextDay = useCallback(() => {
    setDayOffset(prev => prev + 1);
    return '📅 Đã mô phỏng sang ngày tiếp theo! Nội dung này chỉ có tác dụng tạm thời — nhấn F5 sẽ quay về hôm nay.';
  }, []);

  // Công cụ kiểm thử (CHỈ ADMIN): Bỏ trống đủ 3 ngày liên tiếp -> mất streak.
  // Với quy tắc khoảng cách tối đa 3 ngày, phải nhảy tới 4 ngày mới đủ điều kiện đứt chuỗi.
  // Cũng chỉ diễn ra trong RAM. Việc ghi streak = 0 lên Supabase để cho
  // useEffect "tự động hết hạn" đảm nhiệm khi ngày thật sự trôi qua.
  const simulateMissedDays = useCallback(() => {
    setDayOffset(prev => prev + (STREAK_GRACE_DAYS + 1));
    setProgress(prev => ({
      ...prev,
      streak_count: 0
    }));
    return `⚠️ Mô phỏng: đã bỏ trống ${STREAK_GRACE_DAYS} ngày liên tiếp nên chuỗi streak về 0. Nhấn F5 để khôi phục trạng thái thật.`;
  }, []);

  // Thoát chế độ mô phỏng, quay về trạng thái THẬT ngay lập tức.
  // Vì trong lúc mô phỏng ta cố tình không ghi localStorage, bộ nhớ vẫn đang
  // giữ nguyên dữ liệu thật -> chỉ cần nạp lại từ đó.
  const resetSimulation = useCallback(() => {
    setDayOffset(0);

    try {
      const savedProg = storage.getItem(progressKey);
      if (savedProg) setProgress(JSON.parse(savedProg));

      const savedHist = storage.getItem(checkinKey);
      if (savedHist) setCheckinHistory(JSON.parse(savedHist));
    } catch { /* ignore */ }

    return '🔄 Đã quay về ngày thực tế.';
  }, [progressKey, checkinKey]);

  // Đối tượng streak format tương thích với Navbar và HomeTab
  const streakCompatible = {
    count: progress.streak_count,
    checkedToday,
    lastCheckInDate: progress.streak_last_date,
    dayOffset,
    checkinHistory,
    graceDays: STREAK_GRACE_DAYS,
    currentEvolution: getEvolutionByDays(progress.streak_count),
    evolutionProgress: getEvolutionProgress(progress.streak_count)
  };

  return {
    progress,
    mastery,
    completedLessons,
    checkinHistory,
    streak: streakCompatible,
    checkedToday,
    dbStatus,
    isRealtimeActive,
    effectiveToday,
    dayOffset,
    isSimulating,
    recordStudySubmission,
    studyReward: studyReward?.userId === userId ? studyReward : null,
    updateMastery,
    toggleLesson,
    recordExamResult,
    simulateNextDay,
    simulateMissedDays,
    resetSimulation,
    refreshUserData: () => loadUserDataFromSupabase(user?.id)
  };
}
