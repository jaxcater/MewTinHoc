/**
 * Khoá cuộn trang nền khi mở modal/drawer.
 *
 * Vì sao không chỉ dùng `body { overflow: hidden }`:
 *  - iOS Safari và nhiều trình duyệt Android vẫn cho phép cuộn "rubber-band" ở
 *    phần tử gốc (html), nên trang lộ trình phía sau vẫn trượt.
 *  - Khi trang nền trượt, modal `position: fixed` bị lệch theo vùng nhìn thấy,
 *    khiến header/footer của modal đè lên nội dung đang đọc.
 *
 * Cách làm: ghim body bằng `position: fixed` + bù lại `top: -scrollY` để trang
 * không nhảy, khoá luôn html, rồi khôi phục đúng vị trí cuộn khi đóng.
 *
 * Có bộ đếm để nhiều lớp (modal → drawer con) khoá chồng nhau vẫn an toàn.
 */

let lockCount = 0;
let savedState = null;

const canUseDom = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export function lockBodyScroll() {
  if (!canUseDom()) return () => {};

  if (lockCount === 0) {
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    savedState = {
      scrollY,
      body: {
        position: bodyStyle.position,
        top: bodyStyle.top,
        left: bodyStyle.left,
        right: bodyStyle.right,
        width: bodyStyle.width,
        overflow: bodyStyle.overflow,
        overscrollBehavior: bodyStyle.overscrollBehavior
      },
      html: {
        overflow: htmlStyle.overflow,
        overscrollBehavior: htmlStyle.overscrollBehavior
      }
    };

    htmlStyle.overflow = 'hidden';
    htmlStyle.overscrollBehavior = 'none';

    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = '0';
    bodyStyle.right = '0';
    bodyStyle.width = '100%';
    bodyStyle.overflow = 'hidden';
    bodyStyle.overscrollBehavior = 'none';
  }

  lockCount += 1;
  let released = false;

  // Trả về hàm mở khoá; gọi nhiều lần cũng chỉ có tác dụng 1 lần.
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount > 0 || !savedState) return;

    const { scrollY, body, html } = savedState;
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;

    bodyStyle.position = body.position;
    bodyStyle.top = body.top;
    bodyStyle.left = body.left;
    bodyStyle.right = body.right;
    bodyStyle.width = body.width;
    bodyStyle.overflow = body.overflow;
    bodyStyle.overscrollBehavior = body.overscrollBehavior;

    htmlStyle.overflow = html.overflow;
    htmlStyle.overscrollBehavior = html.overscrollBehavior;

    window.scrollTo(0, scrollY);
    savedState = null;
  };
}

export default lockBodyScroll;
