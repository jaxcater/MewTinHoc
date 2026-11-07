import { useEffect } from 'react';
import { isCompanyAdmin } from './roleService';

const LOCK_CLASS = 'interface-images-protected';
const IMAGE_SELECTOR = 'img, svg, canvas, picture, [role="img"]';
const LOCK_STYLES = `
body.${LOCK_CLASS} :is(${IMAGE_SELECTOR}) {
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
  -webkit-user-drag: none !important;
}
`;

function isInterfaceImage(event, doc) {
  const target = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
  if (!target?.closest || target.isContentEditable || target.closest('input, textarea')) return false;
  if (target.closest(IMAGE_SELECTOR)) return true;

  // Chỉ xét ảnh nền của chính phần tử, không chặn văn bản nằm trên ảnh nền
  // (ví dụ nội dung chat trên nền mèo). Kéo đoạn văn vẫn hoạt động bình thường.
  if (event.type === 'dragstart') return false;
  const selection = doc.defaultView.getSelection();
  if (selection && !selection.isCollapsed && selection.containsNode(target, true)) return false;
  if (/url\(/i.test(doc.defaultView.getComputedStyle(target).backgroundImage)) return true;

  // Mèo trang chủ dùng pointer-events:none nên sự kiện rơi vào block bên dưới.
  return [...target.querySelectorAll(IMAGE_SELECTOR)].some(image => {
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  });
}

// Chặn thao tác lưu ảnh giao diện, không chặn tải tài liệu/copy văn bản.
// Đây là hạn chế UI; ảnh đã hiển thị vẫn được trình duyệt tải về để render.
export function installInterfaceImageProtection(doc = document) {
  const style = doc.createElement('style');
  style.textContent = LOCK_STYLES;
  doc.head.append(style);
  doc.body.classList.add(LOCK_CLASS);
  const blockImageAction = event => {
    if (isInterfaceImage(event, doc)) event.preventDefault();
  };
  const events = ['contextmenu', 'dragstart'];
  events.forEach(name => doc.addEventListener(name, blockImageAction, true));
  return () => {
    events.forEach(name => doc.removeEventListener(name, blockImageAction, true));
    doc.body.classList.remove(LOCK_CLASS);
    style.remove();
  };
}

export function useResourceProtection(user) {
  const enabled = user?.isDemo === true || !isCompanyAdmin(user);
  useEffect(() => {
    if (enabled) return installInterfaceImageProtection();
    return undefined;
  }, [enabled]);
}
