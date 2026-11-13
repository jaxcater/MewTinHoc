// ============================================================
//  Log điểm yếu của lần làm đề gần nhất
//
//  Vai trò:
//    - Dựng 1 bản ghi JSON gọn từ (đề + kết quả chấm) sau khi nộp bài
//    - Lưu vào localStorage theo từng tài khoản
//    - Xuất ra bản text tiếng Việt để học viên đọc / tải về
//    - Dựng prompt gửi cho AI (Gemini) kèm đúng những câu đã làm sai
//
//  QUY TẮC: luôn CHỈ CÓ 1 LOG — của lần làm gần nhất. Tạo đề mới thì xoá.
// ============================================================

/** Nhãn 7 chủ đề Phần I (khớp ma trận trong server/exam/config.js) */
export const TOPIC_LABELS = Object.freeze({
  C1: 'Giới thiệu Trí tuệ nhân tạo (AI)',
  C2: 'Mạng máy tính và Internet',
  C3: 'Đạo đức, pháp luật và văn hoá trong môi trường số',
  C4: 'Giới thiệu các hệ cơ sở dữ liệu',
  C5: 'Tạo trang web với HTML và CSS',
  C6: 'Hướng nghiệp với tin học',
  C7: 'Lập trình Python cơ bản',
});

/** Thứ tự ưu tiên hiển thị (giống thứ tự log của server) */
export const TOPIC_ORDER = Object.freeze(['C5', 'C1', 'C2', 'C7', 'C3', 'C4', 'C6']);

export const TRACK_LABELS = Object.freeze({
  ict: 'Tin học ứng dụng (ICT)',
  cs: 'Khoa học máy tính (CS)',
});

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const STATEMENT_KEYS = ['a', 'b', 'c', 'd'];

export const LOG_VERSION = 1;

/* ------------------------------------------------------------------
   Khoá localStorage
   ------------------------------------------------------------------ */

const logKey = (userId) => `tinhoc_exam_gen_log_${userId || 'guest'}`;
const aiKey = (userId) => `tinhoc_exam_ai_review_${userId || 'guest'}`;

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------
   Tiện ích định dạng
   ------------------------------------------------------------------ */

const pad2 = (n) => String(n).padStart(2, '0');

/** Tỉ lệ phần trăm (0–100), làm tròn — dùng cho thanh tiến độ điểm yếu */
export function percentOf(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** 'HH:MM DD/MM/YYYY' theo giờ máy người học */
export function formatDateTimeVN(iso) {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())} ${pad2(
    date.getDate(),
  )}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** 'YYYY-MM-DD' theo giờ địa phương — dùng cho tên file tải về */
export function formatDateForFile(iso) {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return '0000-00-00';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/* ------------------------------------------------------------------
   DỰNG LOG
   ------------------------------------------------------------------ */

/**
 * @param {object}   params
 * @param {object}   params.exam       đề đã phát (có stem/options/scenario/statements)
 * @param {object}   params.result     kết quả chấm từ server
 * @param {object}   [params.cumulative] chỉ số cộng dồn của tài khoản
 * @param {number}   [params.elapsedMinutes] số phút đã làm
 * @returns {object} bản ghi log
 */
export function buildExamLog({ exam, result, cumulative, elapsedMinutes }) {
  const submittedAt = new Date().toISOString();
  const track = result?.track || exam?.track || 'ict';

  /* ---------- Phần I ---------- */
  const topicMap = new Map();
  const wrongQuestions = [];

  const partIDetails = result?.partI?.details || [];
  partIDetails.forEach((detail, index) => {
    const code = detail.topic || 'C1';
    if (!topicMap.has(code)) {
      topicMap.set(code, {
        code,
        name: TOPIC_LABELS[code] || code,
        total: 0,
        correct: 0,
        wrong: 0,
        wrongNos: [],
      });
    }
    const bucket = topicMap.get(code);
    bucket.total += 1;
    if (detail.isCorrect) {
      bucket.correct += 1;
    } else {
      bucket.wrong += 1;
      bucket.wrongNos.push(detail.no ?? index + 1);

      const question = exam?.partI?.[index];
      const chosenIndex = Number.isInteger(detail.submitted) ? detail.submitted : null;
      const answerIndex = Number.isInteger(detail.correctAnswer)
        ? detail.correctAnswer
        : null;

      wrongQuestions.push({
        kind: 'mcq',
        no: detail.no ?? index + 1,
        topic: code,
        topicName: TOPIC_LABELS[code] || code,
        stem: question?.stem || '',
        chosen: chosenIndex === null ? null : OPTION_LABELS[chosenIndex],
        chosenText: chosenIndex === null ? '' : question?.options?.[chosenIndex] || '',
        answer: answerIndex === null ? null : OPTION_LABELS[answerIndex],
        answerText: answerIndex === null ? '' : question?.options?.[answerIndex] || '',
        exp: detail.exp || '',
      });
    }
  });

  const topics = TOPIC_ORDER.filter((code) => topicMap.has(code)).map((code) =>
    topicMap.get(code),
  );

  /* ---------- Phần II ---------- */
  const groups = [
    { key: 'chung', label: 'Đ/S chung', total: 0, correct: 0, wrong: 0 },
    {
      key: track,
      label: track === 'cs' ? 'Đ/S CS' : 'Đ/S ICT',
      total: 0,
      correct: 0,
      wrong: 0,
    },
  ];

  const partIIDetails = result?.partII?.details || [];
  partIIDetails.forEach((detail, index) => {
    // 2 câu đầu là Đ/S chung, 2 câu sau theo định hướng (server/exam/config.js)
    const group = groups[index < 2 ? 0 : 1];
    const question = exam?.partII?.[index];

    detail.statements.forEach((statement, statementIndex) => {
      group.total += 1;
      if (statement.isCorrect) {
        group.correct += 1;
        return;
      }
      group.wrong += 1;

      wrongQuestions.push({
        kind: 'tf',
        no: index + 21,
        topic: group.key === 'chung' ? 'Đ/S chung' : group.label,
        topicName: group.label,
        stem: question?.scenario || '',
        statementKey: statement.key || STATEMENT_KEYS[statementIndex],
        statementText: question?.statements?.[statementIndex]?.text || '',
        chosen:
          typeof statement.submitted === 'boolean'
            ? statement.submitted
              ? 'ĐÚNG'
              : 'SAI'
            : null,
        answer: statement.correct ? 'ĐÚNG' : 'SAI',
        exp: statement.exp || '',
      });
    });
  });

  const statementsTotal = groups.reduce((sum, group) => sum + group.total, 0);
  const statementsWrong = groups.reduce((sum, group) => sum + group.wrong, 0);

  /* ---------- Chủ đề yếu nhất ---------- */
  const weakest = topics
    .filter((topic) => topic.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.total - a.total)
    .slice(0, 3);

  return {
    version: LOG_VERSION,
    examId: result?.examId || exam?.examId || '',
    track,
    trackLabel: TRACK_LABELS[track] || track,
    submittedAt,
    score: Number(result?.totalScore) || 0,
    maxScore: Number(result?.maxScore) || 10,
    accuracy: Number(result?.accuracy) || 0,
    correctItems: Number(result?.correctItems) || 0,
    gradedItems: Number(result?.gradedItems) || 0,
    elapsedMinutes:
      typeof elapsedMinutes === 'number' && elapsedMinutes >= 0
        ? Math.round(elapsedMinutes)
        : null,
    partI: {
      total: result?.partI?.total || partIDetails.length,
      correct: result?.partI?.correct || 0,
      wrong: partIDetails.length - (result?.partI?.correct || 0),
      score: Number(result?.partI?.score) || 0,
      topics,
    },
    partII: {
      total: groups.length,
      statementsTotal,
      statementsCorrect: statementsTotal - statementsWrong,
      statementsWrong,
      score: Number(result?.partII?.score) || 0,
      groups,
    },
    weakest,
    wrong: wrongQuestions,
    cumulative: {
      totalExams: Number(cumulative?.total_exams) || 0,
      avgScore: Number(cumulative?.avg_score) || 0,
      accuracy: Number(cumulative?.accuracy) || 0,
    },
  };
}

/* ------------------------------------------------------------------
   LƯU / ĐỌC / XOÁ
   ------------------------------------------------------------------ */

export function saveExamLog(userId, log) {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(logKey(userId), JSON.stringify(log));
    // Log mới thì đánh giá AI cũ không còn đúng nữa
    storage.removeItem(aiKey(userId));
  } catch (err) {
    console.warn('Không lưu được log điểm yếu:', err?.message);
  }
}

export function readExamLog(userId) {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(logKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version ? parsed : null;
  } catch {
    return null;
  }
}

export function clearExamLog(userId) {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(logKey(userId));
    storage.removeItem(aiKey(userId));
  } catch {
    /* ignore */
  }
}

export function saveAiReview(userId, review) {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(
      aiKey(userId),
      JSON.stringify({ savedAt: new Date().toISOString(), review }),
    );
  } catch (err) {
    console.warn('Không lưu được đánh giá AI:', err?.message);
  }
}

export function readAiReview(userId) {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(aiKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------
   XUẤT TEXT
   ------------------------------------------------------------------ */

/**
 * Bản text tiếng Việt của log — nội dung nút "Tải .txt".
 * @param {object} log
 * @param {{detail?: boolean}} [options] detail=true kèm nguyên văn câu sai
 */
export function formatExamLogText(log, { detail = true } = {}) {
  if (!log) return '';
  const lines = [];
  const rule = (char = '─') => char.repeat(56);

  lines.push('MEWTINHOC — LOG ĐIỂM YẾU (LẦN LÀM GẦN NHẤT)');
  lines.push(`Định hướng: ${log.trackLabel}`);
  lines.push(`Nộp lúc: ${formatDateTimeVN(log.submittedAt)}`);
  lines.push(
    `Điểm: ${log.score.toFixed(2)}/${log.maxScore} · Đúng ${log.correctItems}/${log.gradedItems} ý · Độ chính xác ${log.accuracy}%`,
  );
  if (log.elapsedMinutes !== null) {
    lines.push(`Thời gian làm bài: ${log.elapsedMinutes} phút`);
  }
  lines.push('');

  lines.push('PHẦN I — TRẮC NGHIỆM');
  lines.push(
    `  Sai ${log.partI.wrong}/${log.partI.total} câu · được ${log.partI.score.toFixed(2)}/6,00đ`,
  );
  log.partI.topics.forEach((topic) => {
    lines.push(
      `  · ${topic.code} (${topic.name}): sai ${topic.wrong}/${topic.total} câu` +
        (topic.wrongNos.length ? ` — câu ${topic.wrongNos.join(', ')}` : ''),
    );
  });
  lines.push('');

  lines.push('PHẦN II — ĐÚNG/SAI');
  lines.push(
    `  Sai ${log.partII.statementsWrong}/${log.partII.statementsTotal} ý · được ${log.partII.score.toFixed(
      2,
    )}/4,00đ`,
  );
  log.partII.groups.forEach((group) => {
    lines.push(`  · ${group.label}: sai ${group.wrong}/${group.total} ý`);
  });
  lines.push('');

  lines.push('TỔNG HỢP');
  if (log.weakest.length) {
    lines.push(
      '  Chủ đề cần ôn lại: ' +
        log.weakest
          .map((topic) => `${topic.code} ${topic.name} (sai ${topic.wrong})`)
          .join(' · '),
    );
  } else {
    lines.push('  Không có chủ đề nào sai — làm tốt lắm!');
  }
  lines.push(
    `  Cộng dồn tài khoản: ${log.cumulative.totalExams} đề · điểm TB ${log.cumulative.avgScore.toFixed(
      2,
    )}/10 · độ chính xác ${log.cumulative.accuracy.toFixed(1)}%`,
  );

  if (detail && log.wrong.length) {
    lines.push('');
    lines.push(rule('─'));
    lines.push('CHI TIẾT CÁC CÂU ĐÃ LÀM SAI');
    lines.push(rule('─'));

    log.wrong.forEach((item) => {
      lines.push('');
      if (item.kind === 'mcq') {
        lines.push(`Câu ${item.no} · ${item.topic} (${item.topicName})`);
        lines.push(`  Đề: ${item.stem}`);
        lines.push(
          `  Bạn chọn: ${item.chosen || 'bỏ trống'}${item.chosenText ? ` — ${item.chosenText}` : ''}`,
        );
        lines.push(`  Đáp án đúng: ${item.answer || '?'}${item.answerText ? ` — ${item.answerText}` : ''}`);
        if (item.exp) lines.push(`  Giải thích: ${item.exp}`);
      } else {
        lines.push(
          `Câu ${item.no} · Ý ${String(item.statementKey).toUpperCase()} · ${item.topicName}`,
        );
        if (item.stem) lines.push(`  Ngữ cảnh: ${item.stem}`);
        lines.push(`  Mệnh đề: ${item.statementText}`);
        lines.push(`  Bạn chọn: ${item.chosen || 'bỏ trống'} · Đáp án đúng: ${item.answer}`);
        if (item.exp) lines.push(`  Giải thích: ${item.exp}`);
      }
    });
  }

  lines.push('');
  lines.push(rule('='));
  lines.push(`MewTinHoc · log sinh tự động ${formatDateTimeVN(log.submittedAt)}`);
  return lines.join('\n');
}

/** Tên file tải về: mewtinhoc-log-ict-2026-11-03.txt */
export function examLogFileName(log) {
  return `mewtinhoc-log-${log?.track || 'ict'}-${formatDateForFile(log?.submittedAt)}.txt`;
}

/* ------------------------------------------------------------------
   PROMPT CHO AI
   ------------------------------------------------------------------ */

/** Chỉ dẫn hệ thống — dặn AI trả về đúng JSON để giao diện dựng được */
export const AI_SYSTEM_INSTRUCTION = `Bạn là gia sư môn Tin học cho kỳ thi tốt nghiệp THPT (Chương trình Giáo dục phổ thông hiện hành), dạy học viên người Việt.

Bạn nhận được log kết quả lần làm đề thi thử gần nhất của học viên, kèm nguyên văn những câu em ấy đã làm sai.

Nhiệm vụ: chẩn đoán lỗ hổng kiến thức và đưa ra việc làm cụ thể.

Nguyên tắc bắt buộc:
1. Luôn trả lời bằng TIẾNG VIỆT, xưng "thầy/cô" hoặc "mình", gọi người học là "bạn". Giọng khích lệ nhưng thẳng thắn, không sáo rỗng.
2. Mọi nhận định phải bám vào số liệu trong log hoặc vào nội dung câu hỏi đã sai. Không bịa thêm lỗi mà log không có.
3. Ưu tiên theo mức độ ảnh hưởng tới điểm: chủ đề sai nhiều câu trắc nghiệm (mỗi câu 0,25đ) thường đáng ôn trước chủ đề chỉ sai vài ý Đúng/Sai.
4. Việc cần làm phải làm được trong 30 phút, cụ thể tới mức học viên mở sách ra là biết làm gì (ví dụ "viết lại 3 quy tắc specificity của CSS rồi tự cho ví dụ", không phải "ôn lại CSS").
5. Câu hỏi kiểm tra nhanh phải kiểm tra đúng chỗ học viên vừa sai, ở mức vận dụng, kèm đáp án ngắn gọn ở cuối.
6. Không nhắc tới việc bạn là AI, không xin lỗi, không mở đầu bằng lời chào xã giao.

Trả về JSON đúng theo schema được yêu cầu, không thêm chữ nào ngoài JSON.`;

/**
 * Dựng nội dung gửi cho AI: log dạng text (đầy đủ câu sai) + vài chỉ dẫn phụ.
 * @param {object} log
 */
export function buildAiPrompt(log) {
  const body = formatExamLogText(log, { detail: true });

  return `Dưới đây là log kết quả lần làm đề thi thử gần nhất của tôi.

--- LOG ---
${body}
--- HẾT LOG ---

Hãy phân tích log trên và trả về JSON gồm:
- headline: một câu kết luận ngắn (tối đa 90 ký tự) nói rõ điều quan trọng nhất về lần làm này.
- scoreRead: 2–3 câu đọc kết quả, chỉ ra điểm mạnh giữ được và lỗ hổng lớn nhất, có dẫn số liệu.
- priorities: đúng 3 chủ đề nên ôn ngay, xếp theo mức ưu tiên giảm dần. Mỗi mục có topicCode (C1..C7 hoặc "TF" cho phần Đúng/Sai), topicName, why (lý do lấy từ số liệu log, tối đa 200 ký tự), actions (đúng 3 việc cụ thể làm được trong 30 phút).
- nextHour: 3–5 gạch đầu dòng mô tả lịch ôn 60 phút tới, theo thứ tự thời gian.
- quickCheck: một câu hỏi kiểm tra nhanh kèm đáp án ngắn, cách nhau bằng dòng trống.
- encouragement: một câu kết ngắn, cụ thể cho tình trạng của tôi (tối đa 120 ký tự).`;
}
