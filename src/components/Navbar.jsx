import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Flame,
  Home,
  GitCommit,
  BookOpen,
  Sparkles,
  LogOut,
  ShieldCheck,
  Swords,
  Trophy,
  Menu,
  X
} from 'lucide-react';
import logoMeoCam from '../../img/favicon.png';
import { headerMotionVariants, reducedMotionVariants } from '../variants';
import { isDemoUser, isLockedForDemo, DEMO_FEATURE } from '../lib/demoAccess';
import { nextAvatarFallbackSrc, resolveAvatarSrc } from '../lib/defaultAvatar';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { TrackSplitButton } from './TrackSplitButton';

// Avatar học viên: ảnh lỗi (mất mạng, URL hết hạn) thì rơi dần về ảnh mặc định nằm trong web
// (dùng key={avatar} ở nơi gọi để reset chuỗi fallback khi đổi tài khoản)
function StudentAvatar({ user }) {
  const [fallbackSrc, setFallbackSrc] = useState(null);
  const src = fallbackSrc || resolveAvatarSrc(user?.avatar, user?.name);

  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      className="student-avatar"
      onError={() => {
        setFallbackSrc((current) => nextAvatarFallbackSrc(current || src)); // chặn lặp vô hạn: bước cuối là ảnh nhúng trong code
      }}
    />
  );
}

export const TABS = {
  HOME: 'home',
  ROADMAP: 'roadmap',
  EXAMS: 'exams',
  AI_EXAM: 'ai_exam',
  LEADERBOARD: 'leaderboard',
  ARENA: 'arena'
};

export default function Navbar({
  activeTab: _activeTab,
  setActiveTab,
  user,
  streak,
  onOpenGoogleLogin,
  onLogout,
  onOpenStreakDetails,
  onNavigate,
  onPrefetchTab
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // URL là nguồn sự thật để tab không bị giữ trạng thái cũ sau khi điều hướng từ Home.
  const isHomeActive = location.pathname === '/' || location.pathname === '/home';
  const isRoadmapActive = location.pathname.startsWith('/roadmap');
  const isExamsActive = location.pathname.startsWith('/exams');
  const isAiExamActive = location.pathname.startsWith('/ai-exam');
  const isLeaderboardActive = location.pathname.startsWith('/leaderboard');
  const isArenaActive = location.pathname.startsWith('/arena');

  const activeKey = isRoadmapActive
    ? TABS.ROADMAP
    : isExamsActive
      ? TABS.EXAMS
      : isAiExamActive
        ? TABS.AI_EXAM
        : isLeaderboardActive
          ? TABS.LEADERBOARD
          : isArenaActive
            ? TABS.ARENA
            : isHomeActive
              ? TABS.HOME
              : TABS.HOME;

  // Demo dùng Trang chủ/Lộ trình và xem giới thiệu Bảng thành tích.
  // Các chức năng học nâng cao vẫn được đánh dấu khoá.
  const isDemo = isDemoUser(user);
  const examsLocked = isLockedForDemo(user, DEMO_FEATURE.EXAMS);
  const aiExamLocked = isLockedForDemo(user, DEMO_FEATURE.AI_EXAM);
  const arenaLocked = isLockedForDemo(user, 'arena');

  // Ưu tiên handler do App truyền vào (đã có kiểm tra quyền tài khoản Demo).
  const go = (tabKey) => {
    if (onNavigate) {
      onNavigate(tabKey);
      return;
    }
    if (setActiveTab) setActiveTab(tabKey);
    const fallbackPaths = {
      [TABS.HOME]: '/',
      [TABS.ROADMAP]: '/roadmap',
      [TABS.EXAMS]: '/exams',
      [TABS.AI_EXAM]: '/ai-exam',
      [TABS.LEADERBOARD]: '/leaderboard',
      [TABS.ARENA]: '/arena'
    };
    navigate(fallbackPaths[tabKey] || '/');
  };

  const sidebarItems = [
    {
      key: TABS.HOME,
      id: 'tab-home',
      label: 'Trang chủ',
      icon: Home,
      title: 'Trang chủ'
    },
    {
      key: TABS.ROADMAP,
      id: 'tab-roadmap',
      label: 'Lộ trình học',
      icon: GitCommit,
      badge: 'Mới',
      title: 'Lộ trình học trực quan'
    },
    {
      key: TABS.EXAMS,
      id: 'tab-exams',
      label: 'Kho đề thi',
      icon: BookOpen,
      locked: examsLocked,
      title: examsLocked ? 'Kho đề thi thử chưa mở cho tài khoản Demo' : 'Kho đề thi'
    },
    {
      key: TABS.AI_EXAM,
      id: 'tab-ai-exam',
      label: 'Đề thi AI',
      icon: Sparkles,
      locked: aiExamLocked,
      badge: aiExamLocked ? null : 'AI',
      title: aiExamLocked ? 'Tạo bài thi thử chưa mở cho tài khoản Demo' : 'Tạo bài thi thử bằng AI'
    },
    {
      key: TABS.LEADERBOARD,
      id: 'tab-leaderboard',
      label: 'Bảng thành tích',
      icon: Trophy,
      title: 'Bảng thành tích'
    },
    {
      key: TABS.ARENA,
      id: 'tab-arena',
      label: 'Đấu trường',
      icon: Swords,
      locked: arenaLocked,
      title: arenaLocked ? 'Đấu trường chưa mở cho tài khoản Demo' : 'Đấu trường'
    }
  ];

  const navHeaderVariants = prefersReducedMotion ? reducedMotionVariants : headerMotionVariants;

  return (
    <>
      <motion.header
        variants={navHeaderVariants}
        initial="hidden"
        animate="visible"
        className="horizontal-sidebar"
      >
        {/* Top row: Brand & Student Info (Thanh tiêu đề gọn trên cùng) */}
        <div className="top-nav-row">
          {/* Left: Mobile Drawer Toggle + Brand Logo */}
          <div className="top-nav-brand-group">
            <button
              type="button"
              className="u417-mobile-btn"
              aria-label={mobileDrawerOpen ? 'Đóng menu chức năng' : 'Mở menu chức năng'}
              aria-expanded={mobileDrawerOpen}
              onClick={() => setMobileDrawerOpen((v) => !v)}
            >
              {mobileDrawerOpen ? <X size={19} /> : <Menu size={19} />}
            </button>

            <div
              className="brand-section"
              onClick={() => go(TABS.HOME)}
              style={{ cursor: 'pointer' }}
              title="Về Trang chủ"
            >
              <div className="brand-logo-icon">
                <img src={logoMeoCam} alt="MewTinHoc" className="brand-logo-img" />
              </div>
              <div>
                <div className="brand-title">
                  <span>Mew</span>TinHoc
                  <span className="brand-tag">THPTQG</span>
                </div>
                <div className="brand-slogan">
                  Đồng hành cùng bạn vượt qua kì thi
                </div>
              </div>
            </div>
          </div>

          <div className="top-nav-track-wrap">
            <TrackSplitButton onOpenRoadmap={() => setActiveTab?.(TABS.ROADMAP)} />
          </div>

          {/* Right: Student Information Widget */}
          <div className="student-bar-widget">
            {/* Streak pill button */}
            <div
              className="streak-pill"
              onClick={onOpenStreakDetails}
              title="Nhấp để xem chi tiết chuỗi ngày học tập"
            >
              <Flame size={20} className="streak-flame-icon" />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span className="streak-number">{streak.count} Ngày</span>
                <span className="streak-label">{streak.checkedToday ? 'Đã điểm danh' : 'Chưa điểm danh'}</span>
              </div>
            </div>

            {/* Student Profile & Logout button */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  className="student-profile-chip"
                  title={`Học viên: ${user.name}`}
                >
                  <StudentAvatar key={user.avatar || 'default-avatar'} user={user} />
                  <span className="student-name">{user.name}</span>
                  {isDemo && (
                    <span className="student-demo-tag" title="Bạn đang dùng tài khoản Demo — chưa phải tài khoản thật">
                      Demo
                    </span>
                  )}
                </div>

                {/* Nút Admin chỉ hiển thị riêng cho người công ty (isAdmin === true) */}
                {user?.isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin')}
                    title="Trang Quản Trị Hệ Thống (Dành riêng cho người công ty)"
                    className="nav-admin-btn"
                  >
                    <ShieldCheck size={14} />
                    <span>Admin</span>
                  </button>
                )}

                {/* Logout button */}
                <button
                  onClick={onLogout}
                  title="Đăng xuất tài khoản"
                  className="student-logout-btn"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                className="btn-google-login"
                onClick={onOpenGoogleLogin}
                id="google-login-btn"
              >
                {/* Google G icon */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12c0 1.97.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Đăng nhập Google</span>
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Left Collapsible Sidebar (#417) — Hover to expand labels, click toggle to pin */}
      <CollapsibleSidebar
        items={sidebarItems}
        activeKey={activeKey}
        onSelect={go}
        onPrefetch={onPrefetchTab}
        onLogout={onLogout}
        user={user}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />
    </>
  );
}
