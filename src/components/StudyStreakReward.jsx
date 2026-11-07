import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import StreakEvolutionArt from './StreakEvolutionArt';
import { getEvolutionByDays } from '../lib/streakEvolutions';
import { studyRewardVariants } from '../variants';
import './study-streak.css';

// Đặt ở app shell để phần thưởng hiện ngay tại màn hình kết quả của cả hai luồng.
export default function StudyStreakReward({ reward }) {
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
          aria-label="Đã ghi nhận ngày học">
          <div className="study-reward-art" aria-hidden="true">
            <span className="study-reward-ring" />
            <StreakEvolutionArt className="study-reward-flame" id={getEvolutionByDays(reward.count).id} size={76} />
            <span className="study-reward-spark study-reward-spark--one" />
            <span className="study-reward-spark study-reward-spark--two" />
            <span className="study-reward-spark study-reward-spark--three" />
          </div>
          <div className="study-reward-copy" role="status" aria-live="polite" aria-atomic="true">
            <span className="study-reward-eyebrow"><Check size={13} />Đã ghi nhận hôm nay <span>+50 XP</span></span>
            <div className="study-reward-heading"><strong>{reward.count}</strong><span>ngày tiếp lửa</span></div>
            <p>{reward.source === 'roadmap' ? 'Bài kiểm tra lộ trình' : 'Bài thi thử'} đã giữ nhịp học của bạn.</p>
          </div>
          <button className="study-reward-close" aria-label="Đóng thông báo ngày học" onClick={() => setDismissedReward(reward)}><X size={17} /></button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
