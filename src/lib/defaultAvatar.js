// Avatar mặc định "nằm trong web" — không phụ thuộc dịch vụ ảnh bên ngoài.
// Khi ảnh avatar từ Google/Supabase hoặc ui-avatars.com tải lỗi (mất mạng,
// URL hết hạn, bị chặn referrer...), UI sẽ rơi xuống ảnh dựng sẵn trong public/.

const PUBLIC_BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

// Thứ tự thử tải: PNG do người dùng đặt → SVG dựng sẵn của project
const LOCAL_AVATAR_SRCS = [
  `${PUBLIC_BASE}/avatar-mac-dinh.png`,
  `${PUBLIC_BASE}/avatar-mac-dinh.svg`
];

// Bước cuối cùng: SVG nhúng thẳng trong code, đảm bảo không bao giờ hiện ảnh vỡ
const BUILTIN_AVATAR_SRC =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">' +
      '<circle cx="100" cy="100" r="100" fill="#FFF3E6" />' +
      '<circle cx="100" cy="82" r="34" fill="#F97316" />' +
      '<path d="M30 178a70 70 0 0 1 140 0z" fill="#F97316" />' +
    '</svg>'
  );

/** Avatar mặc định đang có sẵn trong repo: public/avatar-mac-dinh.svg */
export const DEFAULT_AVATAR_SRC = `${PUBLIC_BASE}/avatar-mac-dinh.svg`;

/** Chữ cái đầu của tên trên nền cam (dịch vụ ngoài, chỉ là lựa chọn ban đầu) */
export function buildInitialAvatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'Học viên'
  )}&background=ea580c&color=ffffff&bold=true`;
}

export function resolveAvatarSrc(avatarUrl, name) {
  return avatarUrl || buildInitialAvatarUrl(name);
}

/**
 * Bước tiếp theo trong chuỗi fallback avatar.
 * Ảnh ngoài → PNG trong web → SVG trong web → SVG nhúng trong code (dừng tại đây
 * để tránh lặp vô hạn khi ảnh lỗi vẫn còn được trình duyệt yêu cầu).
 */
export function nextAvatarFallbackSrc(currentSrc) {
  if (currentSrc === BUILTIN_AVATAR_SRC) return currentSrc;

  const index = LOCAL_AVATAR_SRCS.indexOf(currentSrc);
  if (index === -1) return LOCAL_AVATAR_SRCS[0];
  if (index < LOCAL_AVATAR_SRCS.length - 1) return LOCAL_AVATAR_SRCS[index + 1];

  return BUILTIN_AVATAR_SRC;
}
