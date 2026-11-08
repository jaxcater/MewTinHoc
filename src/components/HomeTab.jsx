import React from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  Flame,
  CheckCircle2,
  Zap,

  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  RotateCcw,
  FastForward,
  Code2,
  Database,
  Globe2,
  ShieldAlert,
  Trophy,
  CircleAlert,
  CircleHelp,
  BellRing
} from 'lucide-react';
import { TABS } from './Navbar';
import { isCompanyAdmin } from '../lib/roleService.js';

import { formatLocalDate } from '../lib/userProgress';
import {
  STREAK_EVOLUTIONS,
  getEvolutionByDays,
  getEvolutionProgress
} from '../lib/streakEvolutions';
import StreakEvolutionArt from './StreakEvolutionArt';
import StudyStreakReward from './StudyStreakReward';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  DURATIONS,
  EASINGS,
  bannerContainerVariants,
  bannerItemVariants,
  statsRowVariants,
  statCardVariants,
  matrixGridVariants,
  matrixCardVariants,
  iconHoverVariants,
  reducedMotionVariants
} from '../variants';
import CountUpNumber from './motion/CountUpNumber';
import MasteryBar from './motion/MasteryBar';
import HeroRoomCat from './motion/HeroRoomCat';
import HeroBannerBackground from './motion/HeroBannerBackground';
import { useVisibleAnimations } from '../lib/useVisibleAnimations';
import './home-performance.css';
import StreakFlameStage from './motion/StreakFlameStage';
import './study-streak.css';
import { TRACK_INFO, TRACK_TYPES } from '../data/roadmap';
import { getStationQuiz } from '../data/questions';

const MASTERY_BLOCKS = [
  { key: 'python', label: 'Lập trình & Thuật toán Python', color: '#EA580C', terms: ['python', 'lập trình', 'thuật toán', 'học máy', 'machine learning', 'khoa học dữ liệu'] },
  { key: 'sql', label: 'Cơ sở dữ liệu & SQL', color: '#D97706', terms: ['cơ sở dữ liệu', 'csdl', 'database', 'sql', 'bảng tính', 'excel', 'pivot', 'truy vấn'] },
  { key: 'network', label: 'Mạng Máy Tính & Internet', color: '#7C2D12', terms: ['mạng', 'internet', 'tcp/ip', 'router', 'switch', 'wifi', 'wi-fi', 'đám mây'] },
  { key: 'safety', label: 'An toàn số & Đạo đức ICT', color: '#16A34A', terms: ['an toàn', 'đạo đức', 'pháp luật', 'văn hóa số', 'văn hoá', 'bản quyền', 'sở hữu trí tuệ', 'hướng nghiệp', 'nghề nghiệp', 'html', 'css', 'trang web', 'website', 'đồ họa', 'video'] }
];

const getStationMasteryBlockKeys = (station) => {
  const text = `${station.title || ''} ${station.category || ''} ${station.description || ''} ${(station.skills || []).join(' ')}`.toLocaleLowerCase('vi');
  return MASTERY_BLOCKS.filter((block) => block.terms.some((term) => text.includes(term))).map((block) => block.key);
};

export default function HomeTab({
  user,
  streak,
  progress,
  completedLessons,
  userId: suppliedUserId,
  onSimulateNextDay,
  onSimulateMissedDays,
  onNavigateTab
}) {
  const { track } = useParams();
  const storedTrack = localStorage.getItem('tinhoc_selected_track');
  const activeTrack = track && [TRACK_TYPES.ICT, TRACK_TYPES.CS].includes(track.toLowerCase())
    ? track.toLowerCase()
    : [TRACK_TYPES.ICT, TRACK_TYPES.CS].includes(storedTrack) ? storedTrack : TRACK_TYPES.ICT;
  const [showMasteryHelp, setShowMasteryHelp] = React.useState(false);
  const [showAllEvolutions, setShowAllEvolutions] = React.useState(false);
  const [adminPreviewMode, setAdminPreviewMode] = React.useState(false);
  const [adminPreviewStreak, setAdminPreviewStreak] = React.useState(null);
  const [adminRewardPreview, setAdminRewardPreview] = React.useState(null);
  const prefersReducedMotion = useReducedMotion();
  const dashboardRef = React.useRef(null);
  useVisibleAnimations(dashboardRef, '.hero-welcome-card, .metric-card, .matrix-panel, .matrix-card, .streak-card');
  const streakCardRef = React.useRef(null);
  const streakInView = useInView(streakCardRef, { amount: 0.1 });
  const streakHelpRef = React.useRef(null);
  React.useEffect(() => {
    const closeOutside = (event) => {
      const help = streakHelpRef.current;
      if (help?.open && !help.contains(event.target)) help.open = false;
    };
    const closeOnEscape = (event) => {
      const help = streakHelpRef.current;
      if (event.key === 'Escape' && help?.open) {
        help.open = false;
        help.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  // Tính toán trạng thái các thứ trong tuần hiện tại theo lịch sử điểm danh thực tế
  const now = new Date();
  if (streak?.dayOffset) {
    now.setDate(now.getDate() + streak.dayOffset);
  }
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0: Thứ 2 ... 6: Chủ Nhật

  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const daysOfWeek = dayLabels.map((name, index) => {
    const isToday = index === currentDayOfWeek;
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() - (currentDayOfWeek - index));
    const dayDateStr = formatLocalDate(dayDate);

    // Chỉ sáng ngọn lửa nếu ngày đó nằm trong lịch sử đã điểm danh (checkinHistory)
    // HOẶC hôm nay đã nộp bài đủ điều kiện ghi nhận.
    const hasCheckedInHistory = Array.isArray(streak?.checkinHistory) && streak.checkinHistory.includes(dayDateStr);
    const checked = hasCheckedInHistory || (isToday && !!streak?.checkedToday);

    return { name, checked, isToday, dateStr: dayDateStr };
  });

  const checkedDaysCount = daysOfWeek.filter(d => d.checked).length;

  // ---- Tiến hoá hình dạng Streak (Bộ sưu tập) ----
  const streakCount = streak?.count || 0;
  const curEvo = streak?.currentEvolution || getEvolutionByDays(streakCount);
  const evoProg = streak?.evolutionProgress || getEvolutionProgress(streakCount);
  const curEvoIndex = STREAK_EVOLUTIONS.findIndex(e => e.id === curEvo.id);
  // Chưa điểm danh ngày nào thì coi như chưa sở hữu hình dạng nào cả (0/6).
  const hasStarted = streakCount > 0;
  const unlockedCount = hasStarted ? curEvoIndex + 1 : 0;
  const graceDays = streak?.graceDays ?? 3;

  // Admin preview: override streak display
  const displayStreak = adminPreviewStreak !== null && isCompanyAdmin(user) ? adminPreviewStreak : streakCount;
  const displayEvo = adminPreviewStreak !== null && isCompanyAdmin(user) 
    ? getEvolutionByDays(adminPreviewStreak) 
    : curEvo;
  const displayEvoProg = adminPreviewStreak !== null && isCompanyAdmin(user)
    ? getEvolutionProgress(adminPreviewStreak)
    : evoProg;
  const displayNextEvo = displayEvoProg.next;
  const displayIsMaxEvo = !displayNextEvo && displayStreak > 0;
  const displayHasStarted = displayStreak > 0 || (adminPreviewStreak !== null && isCompanyAdmin(user));
  
  // Admin preview: fill all 7 days with fire
  const displayDaysOfWeek = adminPreviewStreak !== null && isCompanyAdmin(user)
    ? dayLabels.map((name, index) => ({
        name,
        checked: true,
        isToday: index === currentDayOfWeek,
        dateStr: ''
      }))
    : daysOfWeek;
  const displayCheckedDaysCount = adminPreviewStreak !== null && isCompanyAdmin(user) ? 7 : checkedDaysCount;

  // Biến CSS để "nhuộm" màu theo cấp tiến hoá đang sở hữu
  const evoVars = {
    '--evo-accent': displayEvo.accent,
    '--evo-secondary': displayEvo.secondary,
    '--evo-glow': displayEvo.glow,
    '--evo-aura': displayEvo.aura
  };

  const trackData = TRACK_INFO[activeTrack] || TRACK_INFO[TRACK_TYPES.ICT];
  const quizScoresKey = `tinhoc_roadmap_quiz_scores_${suppliedUserId || user?.id || 'guest'}`;
  let savedQuizScores = {};
  try {
    savedQuizScores = JSON.parse(localStorage.getItem(quizScoresKey) || '{}');
  } catch {
    savedQuizScores = {};
  }
  const masteryByBlock = MASTERY_BLOCKS.map((block) => {
    const stations = trackData.stations.filter((station) => getStationMasteryBlockKeys(station).includes(block.key));
    const completedCount = stations.filter((station) => {
      const quizScore = savedQuizScores[`${activeTrack}:${station.id}`]?.accuracy;
      if (typeof quizScore === 'number') return quizScore >= 80;
      if (station.quiz || getStationQuiz(station.id)) return false;
      return station.lessons?.length > 0 && station.lessons.every((lesson) => completedLessons?.[lesson.id]);
    }).length;
    return {
      ...block,
      completedCount,
      totalCount: stations.length,
      value: stations.length ? Math.round((completedCount / stations.length) * 100) : 0
    };
  });

  return (
    <div ref={dashboardRef} className="home-dashboard">
      <div className="home-grid">
        {/* Left Column: Hero & Key Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Welcome Banner */}
          <motion.div
            variants={prefersReducedMotion ? reducedMotionVariants : bannerContainerVariants}
            initial="hidden"
            animate="visible"
            className="hero-welcome-card hero-welcome-card--room"
          >
            {/* Lớp nền trôi nhẹ và đốm sáng mờ ambient */}
            <HeroBannerBackground />

            {/* Mèo tranh sáp ló trực tiếp qua mép block cam trên desktop. */}
            <HeroRoomCat />

            <div className="hero-welcome-content" style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="hero-tag-row">
                <motion.div variants={bannerItemVariants} className="hero-tag" style={{ margin: 0 }}>
                  <Sparkles size={14} />
                  <span>Chương trình ôn luyện bám sát ma trận 2025</span>
                </motion.div>
              </div>

              <motion.h1 variants={bannerItemVariants} className="hero-title">
                Chào mừng, {user?.name || 'Học viên'}!
              </motion.h1>
              <motion.p variants={bannerItemVariants} className="hero-desc">
                Giữ nhịp học mỗi ngày bằng một bài nộp. Ôn từng chặng trong lộ trình và luyện đề thi thử để sẵn sàng cho kỳ thi Tốt nghiệp THPTQG.
              </motion.p>
              <motion.div variants={bannerItemVariants} className="hero-actions">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary-glow"
                  onClick={() => onNavigateTab(TABS.ROADMAP)}
                >
                  <span>Vào lộ trình học</span>
                  <ArrowRight size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-outline-white"
                  onClick={() => onNavigateTab(TABS.AI_EXAM)}
                >
                  <Sparkles size={18} />
                  <span>Tạo đề AI đánh giá năng lực</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>

          {/* Quick Metrics: Stagger trái sang phải 90ms + CountUp 900ms + Hover lift 4px */}
          <motion.div
            variants={statsRowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="metrics-row"
          >
            <motion.div variants={statCardVariants} whileHover="hover" className="metric-card" style={{ '--metric-accent': '#EA580C' }}>
              <motion.div variants={iconHoverVariants} className="metric-icon-wrap" style={{ background: '#FFF1D6', color: '#EA580C' }}>
                <Flame size={20} />
              </motion.div>
              <div className="metric-val">
                <CountUpNumber end={streak?.count ?? 0} suffix=" Ngày" />
              </div>
              <div className="metric-label">Chuỗi Streak liên tục</div>
            </motion.div>

            <motion.div variants={statCardVariants} whileHover="hover" className="metric-card" style={{ '--metric-accent': '#D97706' }}>
              <motion.div variants={iconHoverVariants} className="metric-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <BookOpen size={20} />
              </motion.div>
              <div className="metric-val">
                <CountUpNumber end={progress?.total_exams ?? user?.totalExamsTaken ?? 14} suffix=" Đề" />
              </div>
              <div className="metric-label">Đề thi đã hoàn thành</div>
            </motion.div>

            <motion.div variants={statCardVariants} whileHover="hover" className="metric-card" style={{ '--metric-accent': '#16A34A' }}>
              <motion.div variants={iconHoverVariants} className="metric-icon-wrap" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                <Award size={20} />
              </motion.div>
              <div className="metric-val">
                <CountUpNumber end={progress?.avg_score ?? user?.avgScore ?? 8.9} decimals={1} suffix="/10" />
              </div>
              <div className="metric-label">Điểm trung bình</div>
            </motion.div>

            <motion.div variants={statCardVariants} whileHover="hover" className="metric-card" style={{ '--metric-accent': '#DC2626' }}>
              <motion.div variants={iconHoverVariants} className="metric-icon-wrap" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                <TrendingUp size={20} />
              </motion.div>
              <div className="metric-val">
                <CountUpNumber
                  end={progress?.accuracy != null ? progress.accuracy : (user?.accuracy ? parseFloat(user.accuracy) : 91.4)}
                  decimals={1}
                  suffix="%"
                />
              </div>
              <div className="metric-label">Độ chính xác câu hỏi</div>
            </motion.div>
          </motion.div>

          {/* Ma trận kiến thức THPTQG & Độ thành thục (Dữ liệu thật từ bảng mastery_progress) */}
          <div className="matrix-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div className="section-title mastery-title-wrap" style={{ fontSize: '1.15rem', margin: 0 }}>
                <span className="panel-title-icon"><Zap size={18} color="var(--color-primary)" /></span>
                <span>Mức độ làm chủ 4 khối kiến thức đề thi Bộ GD&ĐT</span>
                <span className="mastery-help-anchor">
                  <button
                    type="button"
                    className="mastery-help-trigger"
                    aria-label="Giải thích cách tính tiến độ làm chủ"
                    aria-expanded={showMasteryHelp}
                    onClick={() => setShowMasteryHelp((open) => !open)}
                                    onMouseEnter={() => setShowMasteryHelp(true)}
                    onMouseLeave={() => setShowMasteryHelp(false)}
                    onFocus={() => setShowMasteryHelp(true)}
                    onBlur={() => setShowMasteryHelp(false)}
                  >
                    <CircleHelp size={14} />
                  </button>
                  {showMasteryHelp && (
                    <span className="mastery-help-popover" role="tooltip">
                      Tiến độ được tính riêng theo định hướng {activeTrack === TRACK_TYPES.CS ? 'Khoa học máy tính (CS)' : 'Tin học ứng dụng (ICT)'}. Mỗi chủ đề hoàn thành từ 80% bài kiểm tra trở lên được tính là đã học; chủ đề không có bài kiểm tra tính khi hoàn thành toàn bộ lý thuyết. Khi hoàn thành hết chủ đề của một khối, tiến độ khối đó đạt 100%.
                    </span>
                  )}
                </span>
              </div>
              <div className="live-chip">
                <span className="live-dot" aria-hidden="true"></span>
                <span>Realtime Sync</span>
              </div>
            </div>

            <motion.div
              className="knowledge-matrix-grid"
              variants={prefersReducedMotion ? reducedMotionVariants : matrixGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
            >
              {masteryByBlock.map((block) => {
                const Icon = block.key === 'python' ? Code2 : block.key === 'sql' ? Database : block.key === 'network' ? Globe2 : ShieldAlert;
                return (
                  <motion.div
                    key={block.key}
                    variants={prefersReducedMotion ? reducedMotionVariants : matrixCardVariants}
                    whileHover={prefersReducedMotion ? undefined : 'hover'}
                    className="matrix-card"
                    style={{ '--card-accent': block.color }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                      <span className="matrix-icon"><Icon size={16} /></span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-deep)' }}>{block.label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Chủ đề hoàn thành {block.totalCount ? `(${block.completedCount}/${block.totalCount})` : ''}</span>
                      <span style={{ color: block.color }}>{block.value}%</span>
                    </div>
                    <MasteryBar value={block.value} color={block.color} />
                  </motion.div>
                );
              })}
            </motion.div>
          </div>



        </div>

        {/* Right Column: Chức năng Streak Học Tập (Feature Highlights) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Chuỗi học tập chỉ tăng khi nộp bài đủ điều kiện. */}
          <motion.div ref={streakCardRef} className="streak-card streak-card--learning" id="streak-card-section"
            data-ambient={streakInView && !prefersReducedMotion ? 'active' : 'paused'}
            style={{ '--streak-aurora-duration': `${DURATIONS.ambientSlow * 2}s`, '--streak-aurora-ease': `cubic-bezier(${EASINGS.easeInOut.join(',')})` }}>
            <div className="study-streak-aurora" aria-hidden="true"><span /><span /></div>
            <div className="streak-card-header">
              <h2 className="study-streak-title"><Flame size={19} aria-hidden="true" />Chuỗi học tập</h2>
              <details className="study-streak-help" ref={streakHelpRef}>
                <summary aria-label="Cách tính và duy trì streak" title="Streak hoạt động như thế nào?"><CircleAlert size={19} /></summary>
                <div className="study-streak-help-panel">
                  <h3>Giữ lửa như thế nào?</h3>
                  <p>Ngày học được ghi nhận khi bạn thực hiện một trong hai cách:</p>
                  <ul>
                    <li>Nộp bài kiểm tra trong <strong>lộ trình học</strong> với điểm lớn hơn 10%. Không cần đạt 80%.</li>
                    <li>Nộp một <strong>đề thi thử</strong> với điểm lớn hơn 10% (trên 1/10 điểm).</li>
                  </ul>
                  <p>Mỗi ngày theo giờ Việt Nam chỉ tăng <strong>1 ngày streak</strong> và nhận <strong>50 XP</strong>. Điểm từ 10% trở xuống không được tính.</p>
                  <p>Được nghỉ tối đa <strong>{graceDays - 1} ngày</strong>. Bỏ trống {graceDays} ngày liên tiếp sẽ bắt đầu lại chuỗi.</p>
                </div>
              </details>
            </div>
            <div className="study-streak-summary">
              <div className="study-streak-total">
                <span className={'study-streak-status ' + (streak.checkedToday ? 'is-complete' : '')}>
                {streak.checkedToday ? <CheckCircle2 size={14} /> : <Flame size={14} />}
                {streak.checkedToday ? 'Đã học hôm nay' : 'Chờ bạn tiếp lửa'}
                </span>
                <div className="study-streak-number"><span>{displayStreak}</span><span>ngày</span></div>
                <span className="study-streak-caption">
                  {displayStreak > 0 ? 'Từng ngày nỗ lực. Một hành trình đáng tự hào.' : 'Hành trình bền bỉ bắt đầu từ hôm nay.'}
                </span>
              </div>
              <StreakFlameStage
                currentEvolution={displayEvo}
                hasStarted={displayHasStarted}
                displayStreak={displayStreak}
                evoVars={evoVars}
              />
            </div>
            <div className="study-streak-milestone">
              <div className="study-streak-milestone-heading">
                <span>Cấp {displayEvo.tier} <span>/ {STREAK_EVOLUTIONS.length}</span></span>
                <strong>{displayIsMaxEvo ? 'Đã đạt cấp cao nhất' : 'Còn ' + displayEvoProg.daysToNext + ' ngày tới cấp ' + displayNextEvo.tier}</strong>
              </div>
              <div className="study-streak-progress" role="progressbar" aria-label="Tiến độ tiến hoá streak" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(displayEvoProg.percent)}>
                <span style={{ transform: 'scaleX(' + Math.min(1, Math.max(0, displayEvoProg.percent / 100)) + ')' }} />
              </div>
              <span className="study-streak-milestone-caption">{displayIsMaxEvo ? 'Tiếp tục viết nên hành trình của bạn.' : 'Tiếp theo: ' + displayNextEvo.name}</span>
            </div>
            {adminPreviewStreak !== null && isCompanyAdmin(user) && (
              <button className="study-streak-preview-exit" onClick={() => setAdminPreviewStreak(null)}>Tắt xem trước</button>
            )}
            <div className="study-streak-week">
              <div className="study-streak-week-heading"><span>Tuần này</span><strong>{displayCheckedDaysCount} / 7 ngày</strong></div>
              <div className="study-streak-calendar">
                {displayDaysOfWeek.map((day, index) => (
                  <div key={day.name} className={'study-streak-day ' + (day.checked ? 'is-done ' : '') + (day.isToday ? 'is-today' : '')}
                    aria-label={day.name + (day.isToday ? ', hôm nay' : '') + ': ' + (day.checked ? 'đã học' : 'chưa ghi nhận')}
                    aria-current={day.isToday ? 'date' : undefined}>
                    <span>{day.name}</span>
                    <div>{day.checked ? <Flame size={19} fill="currentColor" /> : <span className="study-streak-day-dot" />}</div>
                    <span className="study-streak-today-mark">{index === currentDayOfWeek ? 'Hôm nay' : ' '}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="study-streak-next">
              <strong>{streak.checkedToday ? 'Đã thêm một ngày đáng tự hào.' : 'Hôm nay, mình học gì nhỉ?'}</strong>
              {streak.checkedToday && <p>Hẹn bạn ngày mai, cùng giữ ngọn lửa này nhé.</p>}
              {!streak.checkedToday && (
                <div className="study-streak-actions">
                  <button onClick={() => onNavigateTab(TABS.ROADMAP)}><BookOpen size={16} />Vào lộ trình<ArrowRight size={15} /></button>
                  <button onClick={() => onNavigateTab(TABS.AI_EXAM)}><Zap size={16} />Làm đề thi thử<ArrowRight size={15} /></button>
                </div>
              )}
            </div>

            {isCompanyAdmin(user) && (
              <div className="study-streak-test">
                <button type="button" onClick={() => {
                  if (!isCompanyAdmin(user)) return;
                  // Chỉ tạo dữ liệu hiển thị, không gọi luồng ghi nhận ngày học.
                  setAdminRewardPreview(previous => {
                    const sequence = (previous?.sequence || 0) + 1;
                    return { userId: user.id, date: `preview-${sequence}`, sequence,
                      count: Math.max(1, displayStreak), source: 'roadmap' };
                  });
                }}><BellRing size={15} aria-hidden="true" />Test thông báo streak</button>
                <span>Chỉ xem thử · Không cộng điểm</span>
              </div>
            )}

            {/* Streak Evolution Collection - Expandable Panel */}
            <div style={{ 
              borderTop: '1px solid var(--color-border)', 
              paddingTop: '0.75rem',
              marginTop: '0.5rem'
            }}>
              <button
                onClick={() => setShowAllEvolutions(!showAllEvolutions)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--color-deep)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--color-cream)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={16} color="var(--color-primary)" />
                  <span>Bộ sưu tập ({unlockedCount}/{STREAK_EVOLUTIONS.length})</span>
                </div>
                <span style={{ 
                  transform: showAllEvolutions ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                  display: 'inline-block',
                  fontSize: '0.7rem'
                }}>
                  ▼
                </span>
              </button>

              {showAllEvolutions && (
                <div style={{ marginTop: '0.5rem' }}>
                  {/* Admin Preview Mode Toggle */}
                  {isCompanyAdmin(user) && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: '#FFF7ED',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-deep)', fontWeight: 600 }}>
                        🧪 Xem tất cả hình thái (Admin):
                      </span>
                      <button
                        onClick={() => setAdminPreviewMode(!adminPreviewMode)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          border: '1px solid var(--color-primary)',
                          borderRadius: '999px',
                          background: adminPreviewMode ? 'var(--color-primary)' : '#FFFFFF',
                          color: adminPreviewMode ? '#FFFFFF' : 'var(--color-primary)',
                          cursor: 'pointer',
                          transition: 'background-color 160ms ease, color 160ms ease'
                        }}
                      >
                        {adminPreviewMode ? 'BẬT ✓' : 'TẮT'}
                      </button>
                    </div>
                  )}

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--color-cream)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {STREAK_EVOLUTIONS.map((evo, index) => {
                      const isUnlocked = (hasStarted && index <= curEvoIndex) || (isCompanyAdmin(user) && adminPreviewMode);
                      const isCurrent = hasStarted && evo.id === curEvo.id;
                      const isPreviewActive = adminPreviewStreak === evo.minDays && isCompanyAdmin(user);
                      
                      return (
                        <div
                          key={evo.id}
                          onClick={() => {
                            if (isCompanyAdmin(user)) {
                              setAdminPreviewStreak(isPreviewActive ? null : evo.minDays);
                            }
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '0.75rem',
                            background: isPreviewActive ? '#DCFCE7' : (isCurrent ? evo.aura : '#FFFFFF'),
                            borderRadius: 'var(--radius-md)',
                            border: isPreviewActive ? '2px solid #10B981' : (isCurrent ? `2px solid ${evo.accent}` : '1px solid var(--color-border-subtle)'),
                            position: 'relative',
                            transition: 'transform 200ms var(--ease-out), background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                            boxShadow: isPreviewActive ? '0 2px 8px rgba(16, 185, 129, 0.4)' : (isCurrent ? `0 2px 8px ${evo.glow}` : 'none'),
                            cursor: isCompanyAdmin(user) ? 'pointer' : 'default',
                            transform: isPreviewActive ? 'scale(1.05)' : 'scale(1)'
                          }}
                          onMouseEnter={(e) => {
                            if (isCompanyAdmin(user)) {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isCompanyAdmin(user) && !isPreviewActive) {
                              e.currentTarget.style.transform = 'scale(1)';
                            }
                          }}
                        >
                          {isCurrent && !isPreviewActive && (
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: evo.accent,
                              color: '#FFFFFF',
                              fontSize: '0.55rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.4rem',
                              borderRadius: '999px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                            }}>
                              ✓
                            </div>
                          )}

                          {isPreviewActive && (
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: '#10B981',
                              color: '#FFFFFF',
                              fontSize: '0.55rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.4rem',
                              borderRadius: '999px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                            }}>
                              👁️
                            </div>
                          )}

                          {isCompanyAdmin(user) && adminPreviewMode && !isUnlocked && !isPreviewActive && (
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              left: '-6px',
                              background: '#6366F1',
                              color: '#FFFFFF',
                              fontSize: '0.55rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.4rem',
                              borderRadius: '999px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                            }}>
                              🔓
                            </div>
                          )}

                          <StreakEvolutionArt
                            id={evo.id}
                            mono={!isUnlocked}
                            size={60}
                            style={{ 
                              marginBottom: '0.5rem',
                              opacity: isUnlocked ? 1 : 0.25
                            }}
                          />

                          <div style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            color: isUnlocked ? 'var(--color-deep)' : '#999',
                            marginBottom: '0.2rem',
                            minHeight: '2.1em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isUnlocked ? evo.name : '???'}
                          </div>

                          <div style={{
                            fontSize: '0.6rem',
                            color: 'var(--color-text-muted)',
                            textAlign: 'center'
                          }}>
                            {isUnlocked ? evo.dateLabel : `${evo.minDays} ngày`}
                          </div>

                          {isCompanyAdmin(user) && (
                            <div style={{
                              fontSize: '0.55rem',
                              color: '#10B981',
                              textAlign: 'center',
                              marginTop: '0.3rem',
                              fontWeight: 600
                            }}>
                              Click để xem
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Streak Simulation Testing Panel (Chỉ hiển thị cho Admin để tiết kiệm diện tích mobile cho học sinh) */}
            {isCompanyAdmin(user) && (
              <div className="streak-sim-box">
                <div style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--color-deep)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🧪 Công cụ thử nghiệm chu kỳ ngày (Admin):</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Bấm các nút dưới đây để kiểm tra việc tăng streak và mất streak khi qua ngày:
                </div>
                <div className="streak-sim-row">
                  <button
                    className="btn-sim"
                    onClick={onSimulateNextDay}
                    title="Giả lập ngày hôm sau để nộp bài và ghi nhận ngày học"
                  >
                    <FastForward size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                    Tua tới ngày mai (+1 ngày)
                  </button>
                  <button
                    className="btn-sim"
                    onClick={onSimulateMissedDays}
                    style={{ color: '#DC2626' }}
                    title="Giả lập bỏ trống 3 ngày liên tiếp, chuỗi về 0"
                  >
                    <RotateCcw size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                    Bỏ lỡ 3 ngày (Mất streak)
                  </button>
                </div>
              </div>
            )}
          </motion.div>


        </div>
      </div>
      {isCompanyAdmin(user) && adminRewardPreview?.userId === user?.id && createPortal(
        <StudyStreakReward reward={adminRewardPreview} isPreview />,
        document.body
      )}
    </div>
  );
}
