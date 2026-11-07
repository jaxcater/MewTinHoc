// ============================================================
//  Báo cáo "Bài làm lần cuối" — mở trong TAB MỚI
//
//  Thay cho việc tải file .txt: học viên bấm một nút, một tab mới
//  bật lên hiển thị đầy đủ những câu đã làm sai (đề bài, phương án
//  đã chọn, đáp án đúng, giải thích) để đọc và đối chiếu.
//
//  Vì sao dựng HTML rồi ghi thẳng vào tab mới thay vì route SPA:
//    - Tab mới là một lần boot app khác (cần đăng nhập lại, cần tải
//      bundle) → chậm và dễ vỡ khi localStorage chưa sẵn sàng.
//    - Trang báo cáo tự chứa nên in ra PDF được, không phụ thuộc app.
//
//  NÚT "QUAY VỀ": trang báo cáo có nút quay về dạng sticky ở đầu trang.
//  Học viên ghim app lên màn hình chính (PWA standalone) không thể đóng
//  tab, nên nút này: (1) đóng tab báo cáo nếu được, (2) nếu không đóng
//  được thì tự điều hướng về app ngay trong tab đó → không bị kẹt.
//
//  AN TOÀN: mọi nội dung đề bài đều do người khác nhập → BẮT BUỘC
//  escape trước khi chèn vào HTML, nếu không là lỗ XSS.
// ============================================================
import { TOPIC_LABELS, formatDateTimeVN, percentOf } from './examLog.js';

/** Escape ký tự HTML — dùng cho MỌI chuỗi lấy từ đề bài */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `code` trong đề bài → <code> */
function richText(value) {
  return esc(value).replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** Escape chuỗi để nhúng an toàn vào thẻ <script> (chặn `</script>`) */
function escForScript(value) {
  return JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c');
}

/**
 * Đường dẫn tuyệt đối trong app (tôn trọng BASE_URL khi deploy dưới subpath).
 * Trang báo cáo có thể nằm ở `about:blank` hoặc `blob:` → buộc phải có
 * origin tuyệt đối, nếu không link tương đối sẽ trỏ sai chỗ.
 */
function appUrl(path = '') {
  const base = String((import.meta.env && import.meta.env.BASE_URL) || '/').replace(/\/+$/, '');
  const suffix = String(path || '').replace(/^\/+/, '');
  const appPath = suffix ? `${base}/${suffix}` : base || '/';

  let origin = '';
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      origin = window.location.origin !== 'null' ? window.location.origin : '';
    }
  } catch {
    origin = '';
  }

  return origin ? `${origin}${appPath}` : appPath;
}

function mcqCard(item) {
  const chosen = item.chosen
    ? `<span class="pick pick--wrong">${esc(item.chosen)}</span> ${
        item.chosenText ? richText(item.chosenText) : ''
      }`
    : '<em>Bỏ trống</em>';

  return `
    <article class="q">
      <header class="q__head">
        <span class="q__no">Câu ${esc(item.no)}</span>
        <span class="q__topic">${esc(item.topic)} · ${esc(item.topicName)}</span>
      </header>
      <p class="q__stem">${richText(item.stem)}</p>
      <p class="q__row"><span class="q__label">Bạn chọn</span>${chosen}</p>
      <p class="q__row"><span class="q__label">Đáp án đúng</span>${
        item.answer
          ? `<span class="pick pick--right">${esc(item.answer)}</span> ${
              item.answerText ? richText(item.answerText) : ''
            }`
          : '—'
      }</p>
      ${item.exp ? `<p class="q__exp"><strong>Giải thích.</strong> ${richText(item.exp)}</p>` : ''}
    </article>`;
}

function tfCard(item) {
  return `
    <article class="q">
      <header class="q__head">
        <span class="q__no">Câu ${esc(item.no)} · Ý ${esc(
          String(item.statementKey || '').toUpperCase(),
        )}</span>
        <span class="q__topic">${esc(item.topicName)}</span>
      </header>
      ${item.stem ? `<p class="q__stem q__stem--context">${richText(item.stem)}</p>` : ''}
      <p class="q__statement">${richText(item.statementText)}</p>
      <p class="q__row"><span class="q__label">Bạn chọn</span>${
        item.chosen
          ? `<span class="pick pick--wrong">${esc(item.chosen)}</span>`
          : '<em>Bỏ trống</em>'
      }</p>
      <p class="q__row"><span class="q__label">Đáp án đúng</span><span class="pick pick--right">${esc(
        item.answer,
      )}</span></p>
      ${item.exp ? `<p class="q__exp"><strong>Giải thích.</strong> ${richText(item.exp)}</p>` : ''}
    </article>`;
}

/** Toàn bộ HTML của trang báo cáo (tự chứa, không cần mạng) */
export function buildExamLogReportHtml(log) {
  if (!log) {
    return '<!doctype html><meta charset="utf-8"><p>Chưa có bài làm nào.</p>';
  }

  const topics = (log.partI?.topics || []).filter((t) => t.wrong > 0);
  const groups = (log.partII?.groups || []).filter((g) => g.wrong > 0);
  const wrong = log.wrong || [];
  const mcqWrong = wrong.filter((item) => item.kind === 'mcq');
  const tfWrong = wrong.filter((item) => item.kind === 'tf');

  const topicRows = topics
    .map(
      (topic) => `
      <tr>
        <td class="mono">${esc(topic.code)}</td>
        <td>${esc(TOPIC_LABELS[topic.code] || topic.name)}${
          topic.wrongNos?.length
            ? `<span class="muted"> · câu ${esc(topic.wrongNos.join(', '))}</span>`
            : ''
        }</td>
        <td class="num">${esc(topic.wrong)}/${esc(topic.total)}</td>
        <td class="barCell">
          <span class="bar"><span style="width:${percentOf(topic.wrong, topic.total)}%"></span></span>
        </td>
      </tr>`,
    )
    .join('');

  const groupRows = groups
    .map(
      (group) => `
      <tr>
        <td class="mono">P2</td>
        <td>${esc(group.label)}</td>
        <td class="num">${esc(group.wrong)}/${esc(group.total)}</td>
        <td class="barCell">
          <span class="bar"><span style="width:${percentOf(group.wrong, group.total)}%"></span></span>
        </td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Bài làm lần cuối · MewTinHoc</title>
<style>
  :root {
    --ink: #2A1A12;
    --muted: #8C7B71;
    --line: #EADDD2;
    --ground: #FFFBF7;
    --card: #FFFFFF;
    --accent: #C2410C;
    --wrong: #B91C1C;
    --right: #15803D;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2rem 1.25rem 4rem;
    background: var(--ground);
    color: var(--ink);
    font-family: "Be Vietnam Pro", "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 820px; margin: 0 auto; }
  .head { margin-bottom: 1.75rem; }
  .head__top {
    position: sticky; top: 0; z-index: 5;
    display: flex; flex-wrap: wrap; gap: .6rem;
    align-items: center; justify-content: space-between;
    margin: 0 0 1.25rem; padding: .75rem 0;
    background: var(--ground);
    border-bottom: 1px solid var(--line);
  }
  .back-btn {
    display: inline-flex; align-items: center; gap: .45rem;
    min-height: 44px; padding: .7rem 1.15rem; border-radius: 999px;
    border: 1px solid var(--accent); background: var(--accent); color: #fff;
    font-family: inherit; font-size: .9rem; font-weight: 700;
    text-decoration: none; cursor: pointer; white-space: nowrap;
    box-shadow: 0 2px 10px rgba(194, 65, 12, .18);
    -webkit-tap-highlight-color: transparent;
  }
  .back-btn:hover { background: #9A3412; border-color: #9A3412; }
  .back-btn:active { transform: translateY(1px); }
  .back-btn:focus-visible { outline: 3px solid rgba(194, 65, 12, .35); outline-offset: 2px; }
  .brand {
    display: inline-flex; align-items: center; gap: .5rem;
    font-size: .82rem; font-weight: 700; letter-spacing: -.01em;
    color: var(--accent); text-decoration: none;
  }
  h1 {
    margin: 0 0 .4rem;
    font-size: clamp(1.55rem, 4.5vw, 2.1rem);
    line-height: 1.15; letter-spacing: -.025em;
  }
  .when { margin: 0; color: var(--muted); font-size: .9rem; }

  .score {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: .6rem;
    margin: 1.4rem 0 0; padding: 1.1rem 1.25rem;
    background: var(--card); border-radius: 14px;
  }
  .score b { font-size: 2.3rem; line-height: 1; letter-spacing: -.04em; }
  .score b small { font-size: .95rem; font-weight: 600; color: var(--muted); }
  .score span { color: var(--muted); font-size: .9rem; }

  h2 {
    margin: 2.25rem 0 .9rem;
    font-size: 1.02rem; letter-spacing: -.01em;
  }
  h2 .count { color: var(--muted); font-weight: 600; }

  table { width: 100%; border-collapse: collapse; font-size: .9rem; }
  th, td { padding: .5rem .4rem; text-align: left; vertical-align: middle; }
  th {
    font-size: .72rem; font-weight: 700; color: var(--muted);
    text-transform: none; border-bottom: 1px solid var(--line);
  }
  td { border-bottom: 1px solid var(--line); }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .mono { font-weight: 700; color: var(--accent); white-space: nowrap; }
  .muted { color: var(--muted); }
  .barCell { width: 34%; }
  .bar { display: block; height: 6px; border-radius: 99px; background: #F4E7DC; overflow: hidden; }
  .bar > span { display: block; height: 100%; border-radius: 99px; background: #F87171; }

  .q {
    margin: 0 0 .9rem; padding: 1rem 1.15rem;
    background: var(--card); border-radius: 14px;
  }
  .q__head { display: flex; flex-wrap: wrap; gap: .5rem; align-items: baseline; margin-bottom: .55rem; }
  .q__no { font-weight: 700; font-size: .82rem; color: var(--accent); }
  .q__topic { font-size: .78rem; color: var(--muted); }
  .q__stem { margin: 0 0 .7rem; }
  .q__stem--context { color: var(--muted); font-size: .92rem; }
  .q__statement { margin: 0 0 .7rem; font-weight: 600; }
  .q__row { display: flex; flex-wrap: wrap; gap: .45rem; align-items: baseline; margin: 0 0 .35rem; font-size: .93rem; }
  .q__label {
    flex: none; min-width: 6.6rem;
    font-size: .74rem; font-weight: 700; color: var(--muted);
    text-transform: none;
  }
  .pick {
    display: inline-grid; place-items: center;
    min-width: 1.35rem; padding: .05rem .35rem;
    border-radius: 6px; font-size: .78rem; font-weight: 700;
  }
  .pick--wrong { background: #FEE2E2; color: var(--wrong); }
  .pick--right { background: #DCFCE7; color: var(--right); }
  .q__exp {
    margin: .7rem 0 0; padding-top: .7rem;
    border-top: 1px solid var(--line);
    font-size: .9rem; color: #5A4438;
  }
  code {
    padding: .08em .35em; border-radius: 5px;
    background: #F6EDE5; font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
    font-size: .88em;
  }
  .empty {
    padding: 1.5rem; background: var(--card); border-radius: 14px;
    color: var(--muted); text-align: center;
  }
  footer {
    margin-top: 2.5rem; padding-top: 1.1rem;
    border-top: 1px solid var(--line);
    color: var(--muted); font-size: .8rem;
  }
  @media print {
    body { padding: 0; background: #fff; }
    .q, .score { break-inside: avoid; }
    .head__top { position: static; margin: 0 0 1rem; padding: 0; border-bottom: 0; }
    .back-btn { display: none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="head__top">
    <a class="back-btn" id="backBtn" href="${esc(appUrl('ai-exam'))}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
      </svg>
      Quay về
    </a>
    <a class="brand" href="${esc(appUrl())}">MewTinHoc</a>
  </div>

  <div class="head">
    <h1>Bài làm lần cuối — những câu đã sai</h1>
    <p class="when">
      Nộp lúc ${esc(formatDateTimeVN(log.submittedAt))} · ${esc(log.trackLabel)}${
        log.elapsedMinutes !== null && log.elapsedMinutes !== undefined
          ? ` · làm trong ${esc(log.elapsedMinutes)} phút`
          : ''
      }
    </p>
  </div>

  <div class="score">
    <b>${esc(Number(log.score).toFixed(2))}<small>/${esc(log.maxScore)}</small></b>
    <span>
      Đúng ${esc(log.correctItems)}/${esc(log.gradedItems)} ý · Độ chính xác ${esc(log.accuracy)}%
    </span>
  </div>

  ${
    topicRows || groupRows
      ? `<h2>Chủ đề còn hổng</h2>
        <table>
          <thead>
            <tr><th>Mã</th><th>Chủ đề</th><th class="num">Sai</th><th></th></tr>
          </thead>
          <tbody>${topicRows}${groupRows}</tbody>
        </table>`
      : ''
  }

  <h2>Phần I · Trắc nghiệm <span class="count">— ${mcqWrong.length} câu sai</span></h2>
  ${
    mcqWrong.length
      ? mcqWrong.map(mcqCard).join('')
      : '<p class="empty">Không sai câu trắc nghiệm nào.</p>'
  }

  <h2>Phần II · Đúng/Sai <span class="count">— ${tfWrong.length} ý sai</span></h2>
  ${
    tfWrong.length
      ? tfWrong.map(tfCard).join('')
      : '<p class="empty">Không sai ý Đúng/Sai nào.</p>'
  }

  <footer>
    Trang này chỉ hiển thị bài làm gần nhất và không lưu trên máy chủ.
    Bạn có thể in hoặc lưu thành PDF để ôn lại sau.
  </footer>
</div>
<script>
(function () {
  var BACK_PATH = ${escForScript(appUrl('ai-exam'))};
  var HOME_PATH = ${escForScript(appUrl())};

  var backBtn = document.getElementById('backBtn');
  var brand = document.querySelector('.brand');
  if (brand) brand.setAttribute('href', HOME_PATH);
  if (!backBtn) return;
  backBtn.setAttribute('href', BACK_PATH);

  backBtn.addEventListener('click', function (event) {
    event.preventDefault();

    // 1) Không đóng được (PWA ghim app / tab hệ thống) → quay về app
    //    ngay trong tab này để học viên không bị kẹt. Timer được hẹn TRƯỚC
    //    khi đóng tab: nếu tab đóng thành công thì timer bị huỷ theo trang.
    window.setTimeout(function () {
      if (!window.closed) window.location.replace(BACK_PATH);
    }, 150);

    // 2) Ưu tiên đóng tab báo cáo (tab do app mở ra).
    //    App inject __mthCloseReport để đóng chắc chắn, kể cả khi
    //    trình duyệt chặn window.close() trong chính tab con.
    try {
      if (typeof window.__mthCloseReport === 'function') {
        window.__mthCloseReport();
      }
    } catch (e) { /* bỏ qua */ }
    try {
      window.close();
    } catch (e) { /* bỏ qua */ }
  });
})();
</script>
</body>
</html>`;
}

/**
 * Mở báo cáo trong tab mới.
 *
 * Phải gọi ĐỒNG BỘ trong sự kiện click, nếu không trình duyệt sẽ chặn popup.
 * @returns {'opened' | 'blocked'}
 */
export function openExamLogReport(log) {
  if (!log) return 'blocked';

  // Mở tab trắng ngay tại thời điểm click → không bị popup blocker chặn
  const tab = window.open('', '_blank');
  if (!tab) return 'blocked';

  const html = buildExamLogReportHtml(log);

  // Cài callback đóng tab cho trang báo cáo: nút "Quay về" gọi hàm này trước
  // khi thử window.close() (một số trình duyệt chặn close từ chính tab con).
  try {
    tab.__mthCloseReport = () => {
      try {
        tab.close();
      } catch {
        /* bỏ qua */
      }
    };
  } catch {
    /* bỏ qua */
  }

  try {
    tab.document.open();
    tab.document.write(html);
    tab.document.close();
  } catch {
    // Trường hợp hiếm: write bị chặn → chuyển sang Blob URL
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    tab.location.replace(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  try {
    tab.opener = null; // trang tự chứa, không cần giữ tham chiếu ngược
  } catch {
    /* bỏ qua */
  }

  return 'opened';
}
