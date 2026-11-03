// ============================================================
//  Clipboard + tải file, có fallback cho trình duyệt / ngữ cảnh chặn
//  - navigator.clipboard chỉ có trên HTTPS hoặc localhost
//  - execCommand('copy') là đường lui cho http:// và webview cũ
// ============================================================

/**
 * Copy text vào clipboard bằng mọi cách có thể.
 * @returns {Promise<boolean>} true nếu đã copy được
 */
export async function copyText(text) {
  const value = String(text ?? '');
  if (!value) return false;

  // 1. Đường chính: Clipboard API (cần secure context + quyền)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* rơi xuống fallback */
    }
  }

  // 2. Fallback: textarea ẩn + execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Tải một chuỗi text thành file .txt về thư mục Downloads.
 * @param {string} content
 * @param {string} fileName
 * @returns {boolean} true nếu đã kích hoạt tải
 */
export function downloadTextFile(content, fileName = 'mewtinhoc.txt') {
  try {
    // BOM để Excel/Notepad trên Windows nhận đúng tiếng Việt
    const blob = new Blob(['\uFEFF', String(content ?? '')], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Thu hồi sau 1 nhịp để Safari kịp bắt đầu tải
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
