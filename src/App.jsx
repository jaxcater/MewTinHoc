import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar, { TABS } from './components/Navbar';
import HomeTab from './components/HomeTab';
import RoadmapTab from './components/RoadmapTab';
import ExamRepoTab from './components/ExamRepoTab';
import GenExamTab from './components/exam/GenExamTab';
import LoginPage from './components/LoginPage';
import LoadingScreen from './components/LoadingScreen';
import PageTransition from './components/motion/PageTransition';
import { DEFAULT_USER } from './mockData';
import { Flame } from 'lucide-react';
import AdminPage from './components/AdminPage';
import { supabase } from './supabase';
import { useUserProgress } from './lib/userProgress';
import { resolveUserRole, syncUserRoleToSupabase } from './lib/roleService';
import BotpressChatBubble from './components/BotpressChatBubble';
import AnnouncementBanner from './components/AnnouncementBanner';
import DemoLockedView, { DEMO_LOCKED_CONTENT } from './components/demo/DemoLockedView';
import { isDemoUser, isLockedForDemo, featureFromPath } from './lib/demoAccess';
import logoMeoCam from '../img/logomeocam.png';

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastTone, setToastTone] = useState('default');

  // Khi tài khoản Demo bấm "mở khoá", đưa thẳng tới form đăng nhập Google
  // thay vì bắt học viên đọc lại trang giới thiệu.
  const [loginStage, setLoginStage] = useState('landing');

  // Màn hình Loading lúc khởi động app (lần đầu mở web / refresh)
  // Hiển thị tối thiểu ~700ms để tránh "flash" gây khó chịu, đồng thời mask quá trình rehydrate state.
  const [appBooting, setAppBooting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAppBooting(false), 800);
    return () => clearTimeout(t);
  }, []);

  // User state: null = not logged in, object = logged in
  const [user, setUser] = useState(() => {
    // Demo chỉ khôi phục trong sessionStorage; localStorage không phải bằng chứng đăng nhập.
    const demoSaved = sessionStorage.getItem('tinhoc_demo_user');
    if (demoSaved) {
      try {
        return resolveUserRole({ ...JSON.parse(demoSaved), isDemo: true, isAdmin: false, is_admin: false });
      } catch { /* ignore invalid demo state */ }
    }

    // Khi Supabase Auth được cấu hình, chỉ session từ Supabase mới là nguồn xác thực.
    if (supabase) return null;

    const saved = localStorage.getItem('tinhoc_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return resolveUserRole(parsed);
      } catch (e) { /* ignore */ }
    }
    return null; // Start as guest → shows Login page
  });

  // Tích hợp dữ liệu Realtime Database (Streak, Mastery 4 khối, Lộ trình, Lịch sử điểm danh)
  const {
    progress,
    completedLessons,
    streak,
    checkIn,
    toggleLesson,
    recordExamResult,
    simulateNextDay,
    simulateMissedDays,
    resetSimulation
  } = useUserProgress(user);

  // Helper to show toasts
  const showToast = (msg, tone = 'default') => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => {
      setToastMessage(null);
      setToastTone('default');
    }, 4000);
  };

  // Tài khoản demo chỉ tồn tại trong tab hiện tại; tài khoản thật dùng cache UI riêng.
  useEffect(() => {
    if (user?.isDemo) {
      sessionStorage.setItem('tinhoc_demo_user', JSON.stringify(user));
      localStorage.removeItem('tinhoc_user');
    } else if (user) {
      localStorage.setItem('tinhoc_user', JSON.stringify(user));
      sessionStorage.removeItem('tinhoc_demo_user');
    } else {
      localStorage.removeItem('tinhoc_user');
      sessionStorage.removeItem('tinhoc_demo_user');
    }
  }, [user]);


  // Sync Supabase Auth User to App User state
  const syncSupabaseAuthUser = async (authUser) => {
    if (!authUser) return;
    const meta = authUser.user_metadata || {};
    const identities = authUser.identities || [];
    const googleIdentity = identities.find(id => id.provider === 'google') || identities[0];
    const identityData = googleIdentity?.identity_data || {};

    const name = meta.full_name || meta.name || identityData.full_name || identityData.name || meta.user_name || authUser.email?.split('@')[0] || 'Học viên';
    const email = authUser.email || identityData.email || '';
    const avatar = meta.avatar_url || meta.picture || identityData.avatar_url || identityData.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ea580c&color=ffffff&bold=true`;

    const rawUser = {
      id: authUser.id,
      name,
      email,
      avatar,
      grade: 'Lớp 12 — Ôn thi THPTQG',
      provider: authUser.app_metadata?.provider || 'google'
    };

    // Tự động kiểm tra và đồng bộ quyền hạn thực tế từ Supabase profiles
    const syncedUser = await syncUserRoleToSupabase(rawUser);
    setUser(syncedUser);
    localStorage.setItem('tinhoc_user', JSON.stringify(syncedUser));

    // Xóa hash hoặc query OAuth khỏi URL cho gọn gàng
    if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Lắng nghe đăng nhập Google OAuth qua Supabase
  useEffect(() => {
    if (!supabase) return;

    // 1. Kiểm tra session hiện có
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSupabaseAuthUser(session.user);
      }
    });

    // 2. Lắng nghe thay đổi auth (khi redirect từ Google OAuth về, đăng nhập, đăng xuất)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        syncSupabaseAuthUser(session.user);
        showToast(`🎉 Đăng nhập thành công! Chào mừng ${session.user.user_metadata?.full_name || session.user.email}!`);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('tinhoc_user');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Handle login from LoginPage
  const handleLogin = async (googleAccount) => {
    const normalizedEmail = String(googleAccount.email || '').trim().toLowerCase();
    const rawUser = {
      id: googleAccount.id || `demo_${encodeURIComponent(normalizedEmail || 'student')}`,
      name: googleAccount.name || 'Học viên',
      email: normalizedEmail,
      avatar: googleAccount.avatar || DEFAULT_USER.avatar,
      grade: googleAccount.grade || DEFAULT_USER.grade
    };
    const isDemo = googleAccount?.isDemo === true;
    const syncedUser = isDemo
      ? { ...rawUser, isDemo: true, isAdmin: false, is_admin: false, role: 'user' }
      : await syncUserRoleToSupabase(rawUser);
    setUser(syncedUser);
    showToast(`🎉 Chào mừng ${googleAccount.name}! Bắt đầu luyện thi thôi!`);
  };

  // Handle logout → back to Login page
  const handleLogout = async ({ silent = false } = {}) => {
    const wasDemo = isDemoUser(user);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    localStorage.removeItem('tinhoc_user');
    sessionStorage.removeItem('tinhoc_demo_user');
    if (silent) return;
    setLoginStage('landing');
    showToast(
      wasDemo
        ? 'Đã thoát tài khoản Demo. Đăng nhập bằng Google để mở khoá toàn bộ chức năng nhé!'
        : 'Đã đăng xuất tài khoản Google.'
    );
  };

  /* ------------------------------------------------------------------
     TÀI KHOẢN DEMO — chặn các chức năng chỉ dành cho tài khoản thật
     ------------------------------------------------------------------ */
  const navigate = useNavigate();
  const location = useLocation();

  // Bấm vào chức năng bị khoá → không điều hướng, chỉ hiện thông báo.
  const handleDemoBlocked = useCallback((feature) => {
    const text = DEMO_LOCKED_CONTENT[feature]?.toast;
    if (text) showToast(text, 'demo');
  }, []);

  // Muốn mở khoá: thoát phiên Demo rồi quay về màn hình đăng nhập Google.
  const handleRequestUpgrade = useCallback(async () => {
    setLoginStage('auth');
    await handleLogout({ silent: true });
  }, [user]);

  // Điều hướng theo tab (dùng chung cho Navbar và các nút CTA trong nội dung).
  // Với chức năng bị khoá, vẫn mở đúng route để học viên thấy trang thông báo
  // đầy đủ (giải thích + nút đăng nhập), kèm toast để không bị bỏ lỡ.
  const goToTab = useCallback((tabKey) => {
    const path = tabKey === TABS.ROADMAP
      ? '/roadmap'
      : tabKey === TABS.EXAMS
        ? '/exams'
        : tabKey === TABS.AI_EXAM
          ? '/ai-exam'
          : '/';

    if (tabKey) setActiveTab(tabKey);
    navigate(path);

    const feature = featureFromPath(path);
    if (isLockedForDemo(user, feature)) handleDemoBlocked(feature);
  }, [user, handleDemoBlocked]);

  const handleContentNavigate = goToTab;

  // Streak Check-in: +1 streak với Supabase Realtime
  const handleCheckIn = async () => {
    const res = await checkIn();
    if (res?.message) {
      showToast(res.message);
    }
  };

  // Simulation: Tua nhanh 1 ngày (Hôm sau - cho phép điểm danh tiếp)
  const handleSimulateNextDay = () => {
    const msg = simulateNextDay();
    showToast(msg);
  };

  // Simulation: Bỏ lỡ 2 ngày không học -> mất streak về 0
  const handleSimulateMissedDays = async () => {
    const msg = await simulateMissedDays();
    showToast(msg);
  };

  // Simulation: Quay về ngày thực tế
  const handleResetSimulation = () => {
    showToast(resetSimulation());
  };

  // Đồng bộ tab state với URL khi điều hướng bằng nút trong nội dung trang.
  useEffect(() => {
    if (location.pathname.startsWith('/roadmap')) setActiveTab(TABS.ROADMAP);
    else if (location.pathname.startsWith('/exams')) setActiveTab(TABS.EXAMS);
    else if (location.pathname.startsWith('/ai-exam')) setActiveTab(TABS.AI_EXAM);
    else if (location.pathname === '/' || location.pathname === '/home') setActiveTab(TABS.HOME);
  }, [location.pathname]);

  const isAdminRoute = location.pathname.endsWith('/admin') || window.location.hash === '#admin';

  if (isAdminRoute) {
    return <AdminPage currentUser={user} />;
  }

  // Show Login page if not logged in (and not on admin)
  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} initialStage={loginStage} />
        {toastMessage && (
          <div className="toast-notice">
            <Flame size={18} color="var(--color-amber)" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  if (appBooting) {
    return <LoadingScreen text="Đang khởi động MewTinHoc" fullScreen />;
  }

  return (
    <div className="app-container">
      {/* Horizontal Nav Sidebar (Thanh sidebar ngang) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        streak={streak}
        onLogout={handleLogout}
        onNavigate={goToTab}
        onOpenArena={() => showToast('Đang xây dựng')}
        onOpenStreakDetails={() => {
          setActiveTab(TABS.HOME);
          navigate('/');
          setTimeout(() => {
            const el = document.getElementById('streak-card-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      />

      {/* Main Content View with URL Routes & Smooth Tab/Page Transition */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname.startsWith('/roadmap') ? '/roadmap' : location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <HomeTab
                    user={user}
                    streak={streak}
                    progress={progress}
                    completedLessons={completedLessons}
                    userId={user?.id}
                    onCheckIn={handleCheckIn}
                    onSimulateNextDay={handleSimulateNextDay}
                    onSimulateMissedDays={handleSimulateMissedDays}
                    onResetSimulation={handleResetSimulation}
                    onNavigateTab={handleContentNavigate}
                  />
                </PageTransition>
              }
            />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route
              path="/roadmap"
              element={
                <PageTransition>
                  <RoadmapTab
                    user={user}
                    completedLessonIds={completedLessons}
                    onToggleLesson={toggleLesson}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/roadmap/:track"
              element={
                <PageTransition>
                  <RoadmapTab
                    user={user}
                    completedLessonIds={completedLessons}
                    onToggleLesson={toggleLesson}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/exams"
              element={
                <PageTransition>
                  {isLockedForDemo(user, 'exams') ? (
                    <DemoLockedView
                      feature="exams"
                      onUpgrade={handleRequestUpgrade}
                      onGoHome={() => navigate('/')}
                    />
                  ) : (
                    <ExamRepoTab user={user} onRecordExamResult={recordExamResult} />
                  )}
                </PageTransition>
              }
            />
            <Route
              path="/ai-exam"
              element={
                <PageTransition>
                  {isLockedForDemo(user, 'aiExam') ? (
                    <DemoLockedView
                      feature="aiExam"
                      onUpgrade={handleRequestUpgrade}
                      onGoHome={() => navigate('/')}
                    />
                  ) : (
                    <GenExamTab
                      progress={progress}
                      userId={user?.id}
                      onRecordExamResult={recordExamResult}
                    />
                  )}
                </PageTransition>
              }
            />
            <Route
              path="/admin"
              element={
                <PageTransition>
                  <AdminPage />
                </PageTransition>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>


      {/* Footer */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          {/* Brand */}
          <div className="site-footer-brand">
            <div className="site-footer-logo">
              <img src={logoMeoCam} alt="MewTinHoc" className="site-footer-logo-img" />
            </div>
            <div className="site-footer-brand-text">
              <div className="site-footer-brand-name">
                <span className="site-footer-brand-accent">Mew</span>
                <span className="site-footer-brand-name-text">TinHoc</span>
                <span className="site-footer-brand-tag">THPTQG</span>
              </div>
              <div className="site-footer-brand-slogan">
                Đồng hành cùng bạn vượt qua kì thi
              </div>
            </div>
          </div>

          {/* Mô tả */}
          <p className="site-footer-desc">
            Nền tảng luyện thi Tin học tốt nghiệp THPT chuẩn cấu trúc mới của Bộ Giáo dục &amp; Đào tạo. Lộ trình trực quan, kho đề thi chuyên sâu và đánh giá phân hóa bằng trí tuệ nhân tạo (AI).
          </p>

          {/* Dải highlight */}
          <div className="site-footer-highlight">
            <span className="site-footer-highlight-item">Lộ trình trực quan</span>
            <span className="site-footer-highlight-dot" />
            <span className="site-footer-highlight-item">Kho đề thi chuyên sâu</span>
            <span className="site-footer-highlight-dot" />
            <span className="site-footer-highlight-item">Chấm điểm &amp; đánh giá bằng AI</span>
          </div>

          {/* Hàng dưới */}
          <div className="site-footer-bottom">
            <span className="site-footer-copyright">
              © 2026 <strong>MewTinHoc</strong>. Bảo lưu mọi quyền.
            </span>
            <span className="site-footer-account">
              Tài khoản Google đang kết nối: <strong>{user?.name || 'Khách'}</strong>
            </span>
          </div>
        </div>
      </footer>

      {/* Botpress Cloud Floating AI Chat Bubble */}
      <BotpressChatBubble user={user} onRequestUpgrade={handleRequestUpgrade} />

      {/* Thông báo từ Admin gửi tới mọi người truy cập */}
      <AnnouncementBanner />

      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className={`toast-notice${toastTone === 'demo' ? ' toast-notice--demo' : ''}`}>
          <Flame size={18} color="var(--color-amber)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
