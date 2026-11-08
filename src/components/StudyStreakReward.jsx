import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, X, Zap } from 'lucide-react';
import StreakEvolutionArt from './StreakEvolutionArt';
import { getEvolutionByDays } from '../lib/streakEvolutions';
import { DURATIONS, studyRewardVariants } from '../variants';
import './study-streak.css';

// Đặt ở app shell để phần thưởng hiện ngay tại màn hình kết quả của cả hai luồng.
export default function StudyStreakReward({ reward, isPreview = false }) {
  const [dismissedReward, setDismissedReward] = useState(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(() => setDismissedReward(reward), 6500);
    return () => clearTimeout(timer);
  }, [reward]);

  const visible = reward && reward !== dismissedReward;
  return (
    <AnimatePresence>
      {visible && (
        <motion.aside className="study-reward" key={reward.userId + reward.date}
          variants={studyRewardVariants} custom={reducedMotion}
          initial="hidden" animate="visible" exit="exit"
          style={{ '--reward-enter': `${DURATIONS.pageEnter}s`, '--reward-burst': `${DURATIONS.countUp}s`,
            '--reward-micro': `${DURATIONS.micro}s`, '--reward-delay': `${DURATIONS.tabSwitch}s` }}
          aria-label={isPreview ? 'Xem thử thông báo streak' : 'Đã ghi nhận ngày học'}>
          <span className="study-reward-sheen" aria-hidden="true" />
          <div className="study-reward-art" aria-hidden="true">
            <span className="study-reward-medallion" />
            <span className="study-reward-ring" />
            <StreakEvolutionArt className="study-reward-flame" id={getEvolutionByDays(reward.count).id} size={76} />
            <span className="study-reward-spark study-reward-spark--one" />
            <span className="study-reward-spark study-reward-spark--two" />
            <span className="study-reward-spark study-reward-spark--three" />
            <span className="study-reward-spark study-reward-spark--four" />
          </div>
          <div className="study-reward-copy" role="status" aria-live="polite" aria-atomic="true">
            <span className="study-reward-eyebrow"><span className="study-reward-check"><Check size={11} strokeWidth={3} aria-hidden="true" /></span>{isPreview ? 'Xem thử thông báo · Admin' : 'Đã giữ lửa hôm nay'}</span>
            <div className="study-reward-heading"><strong>{reward.count}</strong><span>ngày tiếp lửa</span></div>
            <p>{reward.source === 'roadmap' ? 'Bài kiểm tra lộ trình' : 'Bài thi thử'} đã giữ nhịp học của bạn.</p>
            <div className="study-reward-footer"><span className="study-reward-xp"><Zap size={12} fill="currentColor" aria-hidden="true" />+50 XP</span><span>{isPreview ? 'Bản xem thử, không cộng điểm.' : 'Thêm một ngày bền bỉ.'}</span></div>
          </div>
          <button type="button" className="study-reward-close" aria-label="Đóng thông báo ngày học" onClick={() => setDismissedReward(reward)}><X size={16} /></button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
