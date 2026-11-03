/**
 * Tài khoản Demo (Học viên mẫu) chỉ được trải nghiệm Trang chủ và Lộ trình.
 * Module này gom toàn bộ luật "chức năng nào bị khoá" về một chỗ để
 * Navbar, các tab và khung chat CamCam dùng chung một nguồn sự thật.
 */

export const DEMO_FEATURE = {
  EXAMS: 'exams',
  AI_EXAM: 'aiExam',
  CHAT: 'chat',
};

/** Tài khoản demo: cờ isDemo do App gắn khi đăng nhập nhanh. */
export function isDemoUser(user) {
  return user?.isDemo === true;
}

/** Chức năng này có bị khoá với tài khoản Demo không? */
export function isLockedForDemo(user, feature) {
  if (!isDemoUser(user)) return false;
  return feature === DEMO_FEATURE.EXAMS
    || feature === DEMO_FEATURE.AI_EXAM
    || feature === DEMO_FEATURE.CHAT;
}

/** Map từ đường dẫn route → chức năng tương ứng (null nếu không bị khoá). */
export function featureFromPath(pathname = '') {
  if (pathname.startsWith('/exams')) return DEMO_FEATURE.EXAMS;
  if (pathname.startsWith('/ai-exam')) return DEMO_FEATURE.AI_EXAM;
  return null;
}
