// ============================================================
//  Loader: gom câu hỏi từ 2 nguồn thành pool chuẩn hoá
//
//   1. <DATA_ROOT>/sourcedethi/*.txt   (định dạng mới, ưu tiên)
//      <DATA_ROOT>/sourcedethi/*.json  (định dạng cũ, vẫn hỗ trợ)
//   2. repo/src/data/questions/chuong*.js  (ngân hàng sẵn có của web)
//
//  Định dạng .txt được nhận diện TỰ ĐỘNG — không cần biết trước là
//  JSON, JSON Lines, hay văn bản có nhãn. Xem readTextSource().
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  MCQ_OPTION_COUNT,
  SOURCE_BASENAMES,
  TF_STATEMENT_COUNT,
  TOPIC_ORDER,
  repoRoot,
  resolveSourceFile,
} from './config.js';

const MIN_STEM_LENGTH = 8;

/** Chuẩn hoá text để so trùng: bỏ dấu, bỏ khoảng trắng, bỏ ký tự đặc biệt */
export function normalizeKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

// ------------------------------------------------------------
//  Làm sạch text
// ------------------------------------------------------------

/**
 * Bỏ rác số câu do script sinh dữ liệu để lại: " ... ? (Câu 52)"
 * 60/100 câu trong nguồn cũ dính lỗi này, và chính nó che giấu
 * việc câu bị lặp (mỗi bản sao mang một số khác nhau).
 */
export function cleanStem(text) {
  return String(text || '')
    .replace(/\s*\(Câu\s*\d+\)\s*$/gi, '')
    .replace(/\s*\(Câu\s*\d+\)/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

/** Bỏ tiền tố "Giải thích:" vì UI đã tự hiển thị nhãn */
export function cleanExplanation(text) {
  return String(text || '')
    .replace(/^\s*Gi[aả]i\s*th[ií]ch\s*[:：]\s*/i, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

/** Bỏ nhãn phương án cũ trước khi đảo; giữ đường dẫn như C:\\ hoặc D:/ */
export function stripOptionPrefix(option) {
  return String(option ?? '')
    .replace(/^\s*[A-D]\s*(?:[.)]|[:：](?![\\/]))\s*/i, '')
    .trim();
}

// ------------------------------------------------------------
//  Chuẩn hoá đáp án
// ------------------------------------------------------------

/**
 * Parse nhãn đáp án → chỉ số 0..3.
 * Nhận: "Đáp án A", "A", "a", "A.", "1", "0" ...
 * Ném lỗi nếu không khớp: thà fail còn hơn âm thầm mặc định về A
 * (nguồn cũ có 89% đáp án là A, mặc định sai sẽ tạo đề sai hàng loạt).
 */
export function parseAnswerLabel(label) {
  if (typeof label === 'number' && Number.isInteger(label)) {
    if (label >= 0 && label <= 3) return label;
    if (label >= 1 && label <= 4) return label - 1;
    throw new Error(`Chỉ số đáp án ngoài phạm vi: ${label}`);
  }

  const raw = String(label ?? '').trim();
  if (!raw) throw new Error('Thiếu đáp án');

  // Chuẩn hoá để bắt được cả "Đáp án A" (Đ hoa) lẫn "Dap an A" (không dấu)
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

  // Dạng "Đáp án A" / "dap an A" / "answer B"
  const labelled = normalized.match(
    /^(?:dap\s*an|answer|correct|dung)\s*([a-d])\s*[.)]?\s*$/,
  );
  if (labelled) return labelled[1].toUpperCase().charCodeAt(0) - 65;

  // Dạng chỉ có chữ cái: "A", "a", "A.", "B)"
  const plainLetter = normalized.match(/^([a-d])\s*[.)]?\s*$/);
  if (plainLetter) return plainLetter[1].toUpperCase().charCodeAt(0) - 65;

  // Dạng số: "1".."4" (1-based) hoặc "0".."3" (0-based)
  const digit = normalized.match(/^(\d+)\s*$/);
  if (digit) {
    const value = Number(digit[1]);
    if (value >= 0 && value <= 3) return value;
    if (value >= 1 && value <= 4) return value - 1;
  }

  throw new Error(`Đáp án không hợp lệ: ${JSON.stringify(raw)}`);
}

/**
 * Parse đáp án đúng/sai.
 * Nhận: boolean, "Đúng"/"Sai", "ĐÚNG"/"SAI", "true"/"false", "T"/"F",
 *       "1"/"0", "Đ"/"S".
 */
export function parseBooleanLabel(label) {
  if (typeof label === 'boolean') return label;
  if (typeof label === 'number') return label !== 0;

  const raw = String(label ?? '').trim();
  if (!raw) throw new Error('Thiếu đáp án đúng/sai');

  // So sánh trên bản đã bỏ dấu, lowercase, bỏ ký tự thừa
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');

  if (['dung', 'true', 't', 'yes', 'y', '1', 'd'].includes(normalized)) return true;
  if (['sai', 'false', 'f', 'no', 'n', '0', 's'].includes(normalized)) return false;

  throw new Error(`Đáp án đúng/sai không hợp lệ: ${JSON.stringify(raw)}`);
}

// ------------------------------------------------------------
//  Đọc file nguồn (.txt / .json) — tự nhận diện định dạng
// ------------------------------------------------------------

/**
 * Cắt một khối văn bản lớn thành các object JSON liền nhau.
 * Phục vụ trường hợp .txt chứa nhiều object JSON nối tiếp mà không có
 * dấu phẩy / không bọc trong mảng (rất hay gặp khi người ta copy-paste
 * từ công cụ sinh dữ liệu ra .txt).
 */
function splitConcatenatedJson(text) {
  const results = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const chunk = text.slice(start, i + 1);
        try {
          results.push(JSON.parse(chunk));
        } catch {
          /* khối hỏng -> bỏ qua */
        }
        start = -1;
      }
      if (depth < 0) depth = 0;
    }
  }
  return results;
}

/** Chuẩn hoá về mảng record bất kể file bọc ngoài là mảng hay object */
function toRecordArray(parsed) {
  if (Array.isArray(parsed)) return parsed.flatMap(toRecordArray);
  if (parsed && typeof parsed === 'object') {
    // Object rỗng / không có field nào dùng được → bỏ, tránh tạo record rác
    const keys = Object.keys(parsed);
    if (keys.length === 0) return [];

    // Object bọc: { cau_hoi, phuong_an } là 1 record
    if ('cau_hoi' in parsed || 'tinh_huong' in parsed || 'q' in parsed || 'scenario' in parsed) {
      return [parsed];
    }
    // Object chứa mảng: { data: [...] }, { questions: [...] } ...
    for (const value of Object.values(parsed)) {
      if (Array.isArray(value)) return value.flatMap(toRecordArray);
    }
    return [parsed];
  }
  return [];
}

/**
 * Đọc file nguồn, tự nhận diện 1 trong các định dạng:
 *   1. JSON thuần            : [ {...}, {...} ]
 *   2. JSON Lines            : {..}\n{..}\n{..}
 *   3. Nhiều JSON nối tiếp   : {..}{..}{..}
 *   4. Văn bản có nhãn       : "Câu hỏi: ...", "A. ...", "Đáp án: A"
 * @returns {object[]} mảng record thô, chưa chuẩn hoá
 */
export function readTextSource(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.warn(`[exam] Không đọc được ${path.basename(filePath)}: ${err.message}`);
    return [];
  }

  // Bỏ BOM (Windows hay thêm khi lưu .txt bằng Notepad)
  raw = raw.replace(/^\uFEFF/, '');
  const text = raw.trim();
  if (!text) return [];

  // (1) JSON thuần
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return toRecordArray(JSON.parse(text));
    } catch {
      // (2)+(3) JSON Lines hoặc nhiều object nối tiếp
      const chunks = splitConcatenatedJson(text);
      if (chunks.length > 0) return chunks.flatMap(toRecordArray);
      console.warn(`[exam] ${path.basename(filePath)}: JSON hỏng, thử đọc dạng văn bản`);
    }
  }

  // (4) Văn bản có nhãn
  const labelled = parseLabelledText(text);
  if (labelled.length > 0) return labelled;

  console.warn(`[exam] ${path.basename(filePath)}: không nhận diện được định dạng`);
  return [];
}

/**
 * Parse định dạng văn bản có nhãn. Hỗ trợ cả tiếng Việt có/không dấu.
 *
 *   Câu hỏi: Nội dung câu hỏi?
 *   A. Phương án 1
 *   B. Phương án 2
 *   C. Phương án 3
 *   D. Phương án 4
 *   Đáp án: B
 *   Giải thích: ...
 *
 * Và với đúng/sai:
 *   Tình huống: ...
 *   a) Phát biểu 1 — Đúng
 *   b) Phát biểu 2 — Sai
 */
function parseLabelledText(text) {
  const lines = text.split(/\r?\n/);
  const records = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const hasStem = current.cau_hoi || current.tinh_huong;
    const hasBody =
      (current.phuong_an && current.phuong_an.length > 0) ||
      (current.cac_menh_de && current.cac_menh_de.length > 0);
    if (hasStem && hasBody) records.push(current);
    current = null;
  };

  const labels = {
    stem: /^\s*(?:c[âa]u\s*h[ỏo]i|cau\s*hoi)\s*[:：]\s*(.+)$/i,
    scenario: /^\s*(?:t[ìi]nh\s*hu[ốo]ng|tinh\s*huong)\s*[:：]\s*(.+)$/i,
    option: /^\s*([A-D])\s*[.):：]\s*(.+)$/i,
    answer: /^\s*(?:[đd][áa]p\s*[áa]n|dap\s*an|answer)\s*[:：]\s*(.+)$/i,
    explanation: /^\s*(?:gi[ảa]i\s*th[íi]ch|giai\s*thich|explanation)\s*[:：]\s*(.+)$/i,
    // đúng/sai: "a) Nội dung — Đúng" hoặc "a) Nội dung (Sai)"
    statement: /^\s*([a-d])\s*[.)]\s*(.+)$/i,
    tfAnswer: /[—–-]\s*(?:[đd][úu]ng|sai|dung|true|false)\s*$/i,
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const stemMatch = trimmed.match(labels.stem);
    if (stemMatch) {
      flush();
      current = { cau_hoi: stemMatch[1].trim(), phuong_an: [], dap_an: '' };
      continue;
    }

    const scenarioMatch = trimmed.match(labels.scenario);
    if (scenarioMatch) {
      flush();
      current = { tinh_huong: scenarioMatch[1].trim(), cac_menh_de: [] };
      continue;
    }

    if (!current) continue;

    const explanationMatch = trimmed.match(labels.explanation);
    if (explanationMatch) {
      current.giai_thich = explanationMatch[1].trim();
      continue;
    }

    const answerMatch = trimmed.match(labels.answer);
    if (answerMatch) {
      current.dap_an = answerMatch[1].trim();
      continue;
    }

    // Đúng/sai: mệnh đề a) b) c) d)
    const statementMatch = trimmed.match(labels.statement);
    if (statementMatch && current.cac_menh_de) {
      let body = statementMatch[2].trim();
      let dapAn = '';
      const tfMatch = body.match(labels.tfAnswer);
      if (tfMatch) {
        dapAn = tfMatch[0].replace(/^[—–-]\s*/, '').trim();
        body = body.replace(labels.tfAnswer, '').trim();
      } else {
        // "(Đúng)" ở cuối
        const parenMatch = body.match(/[(（]\s*([đd][úu]ng|sai|dung|true|false)\s*[)）]\s*$/i);
        if (parenMatch) {
          dapAn = parenMatch[1];
          body = body.replace(parenMatch[0], '').trim();
        }
      }
      current.cac_menh_de.push({
        ky_hieu: statementMatch[1].toLowerCase(),
        phat_bieu: body,
        dap_an: dapAn,
      });
      continue;
    }

    // Phương án trắc nghiệm A. B. C. D.
    const optionMatch = trimmed.match(labels.option);
    if (optionMatch && Array.isArray(current.phuong_an)) {
      current.phuong_an.push(optionMatch[2].trim());
    }
  }

  flush();
  return records;
}

// ------------------------------------------------------------
//  Chuẩn hoá record thô → câu hỏi dùng được
// ------------------------------------------------------------

/** Nhận diện record có phải câu trắc nghiệm không (hỗ trợ cả schema cũ/mới) */
function isMcqRecord(record) {
  return Boolean(
    record &&
      (record.cau_hoi !== undefined ||
        record.q !== undefined ||
        record.stem !== undefined),
  );
}

/** Nhận diện record có phải câu đúng/sai không */
function isTfRecord(record) {
  return Boolean(
    record &&
      (record.tinh_huong !== undefined ||
        record.cac_menh_de !== undefined ||
        record.scenario !== undefined ||
        record.items !== undefined),
  );
}

/** Lấy danh sách phương án từ record, chấp nhận nhiều tên field */
function extractOptions(record) {
  const raw =
    record.phuong_an ??
    record.options ??
    record.opts ??
    record.answers ??
    record.lua_chon;
  if (!Array.isArray(raw)) return [];
  return raw.map((option) => {
    if (option && typeof option === 'object') {
      return stripOptionPrefix(option.text ?? option.noi_dung ?? option.label ?? '');
    }
    return stripOptionPrefix(option);
  });
}

/** Lấy nhãn đáp án từ record */
function extractAnswer(record) {
  return (
    record.dap_an ??
    record.answer ??
    record.correct ??
    record.dapAn ??
    record.ans ??
    record.dung
  );
}

function normalizeStemText(record) {
  return cleanStem(record.cau_hoi ?? record.q ?? record.stem ?? record.noi_dung);
}

/** Chuẩn hoá 1 câu trắc nghiệm */
function normalizeMcq(record, topic) {
  const stem = normalizeStemText(record);
  const options = extractOptions(record);

  if (!stem || stem.length < MIN_STEM_LENGTH) return null;
  if (options.length !== MCQ_OPTION_COUNT) return null;
  if (options.some((option) => !option)) return null;

  const rawAnswer = extractAnswer(record);
  // Ngân hàng web dùng chỉ số 0..3 trong field `ans`
  const isIndexAnswer = typeof rawAnswer === 'number' && record.ans === rawAnswer;

  let ans;
  try {
    ans = isIndexAnswer && rawAnswer >= 0 && rawAnswer <= 3
      ? rawAnswer
      : parseAnswerLabel(rawAnswer);
  } catch (err) {
    console.warn(`[exam] Bỏ câu ${topic}: ${err.message} — "${stem.slice(0, 50)}"`);
    return null;
  }

  return {
    topic,
    stem,
    options,
    ans,
    exp: cleanExplanation(record.giai_thich ?? record.exp ?? record.explanation),
    origin: record.__origin || 'source',
  };
}

/** Chuẩn hoá 1 câu đúng/sai */
function normalizeTf(record) {
  const scenario = cleanStem(
    record.tinh_huong ?? record.scenario ?? record.ctx ?? record.context,
  );
  const rawStatements = record.cac_menh_de ?? record.items ?? record.statements;

  if (!scenario || scenario.length < MIN_STEM_LENGTH) return null;
  if (!Array.isArray(rawStatements)) return null;
  if (rawStatements.length !== TF_STATEMENT_COUNT) return null;

  const statements = [];
  for (const statement of rawStatements) {
    const text = cleanStem(
      statement.phat_bieu ?? statement.text ?? statement.s ?? statement.noi_dung,
    );
    const rawAnswer =
      statement.dap_an ?? statement.ans ?? statement.correct ?? statement.answer;

    if (!text) return null;

    let ans;
    try {
      ans = parseBooleanLabel(rawAnswer);
    } catch (err) {
      console.warn(`[exam] Bỏ câu đúng/sai: ${err.message}`);
      return null;
    }

    statements.push({
      text,
      ans,
      exp: cleanExplanation(
        statement.giai_thich ?? statement.exp ?? statement.explanation,
      ),
    });
  }

  return { scenario, statements, origin: record.__origin || 'source' };
}

// ------------------------------------------------------------
//  Nạp từng nguồn
// ------------------------------------------------------------

/** Nạp trắc nghiệm từ sourcedethi (C1..C7, .txt ưu tiên .json) */
function loadSourceMcq(stats) {
  const out = [];

  for (const topic of Object.keys(SOURCE_BASENAMES).filter((key) => key.startsWith('C'))) {
    const filePath = resolveSourceFile(SOURCE_BASENAMES[topic]);
    if (!filePath) {
      stats.missing.push(`sourcedethi/${SOURCE_BASENAMES[topic]}.txt`);
      continue;
    }

    const records = readTextSource(filePath);
    let accepted = 0;
    let rejected = 0;

    for (const record of records) {
      if (!isMcqRecord(record)) {
        rejected += 1;
        continue;
      }
      const normalized = normalizeMcq({ ...record, __origin: 'sourcedethi' }, topic);
      if (normalized) {
        out.push(normalized);
        accepted += 1;
      } else {
        rejected += 1;
      }
    }

    stats.files.push({
      file: path.basename(filePath),
      topic,
      records: records.length,
      accepted,
      rejected,
    });
  }

  return out;
}

/** Nạp đúng/sai từ sourcedethi */
function loadSourceTf(stats, buckets = ['chung', 'cs', 'ict']) {
  const result = { chung: [], cs: [], ict: [] };

  for (const bucket of buckets) {
    const filePath = resolveSourceFile(SOURCE_BASENAMES[bucket]);
    if (!filePath) {
      stats.missing.push(`sourcedethi/${SOURCE_BASENAMES[bucket]}.txt`);
      continue;
    }

    const records = readTextSource(filePath);
    let accepted = 0;
    let rejected = 0;

    for (const record of records) {
      if (!isTfRecord(record)) {
        rejected += 1;
        continue;
      }
      const normalized = normalizeTf({ ...record, __origin: 'sourcedethi' });
      if (normalized) {
        result[bucket].push(normalized);
        accepted += 1;
      } else {
        rejected += 1;
      }
    }

    stats.files.push({
      file: path.basename(filePath),
      topic: bucket,
      records: records.length,
      accepted,
      rejected,
    });
  }

  return result;
}

/** Đọc ngân hàng câu hỏi sẵn có của web (src/data/questions/chuong*.js) */
const BANK_MODULES = [
  { file: 'chuong1.js', topic: 'C1' },
  { file: 'chuong2.js', topic: 'C2' },
  { file: 'chuong3.js', topic: 'C3' },
  { file: 'chuong4.js', topic: 'C4' },
  { file: 'chuong5.js', topic: 'C5' },
  { file: 'chuong6.js', topic: 'C6' },
  { file: 'chuong7.js', topic: 'C7' },
];

async function loadBankQuestions() {
  const mcq = [];
  const tf = [];
  const questionsDir = path.join(repoRoot, 'src', 'data', 'questions');

  for (const { file, topic } of BANK_MODULES) {
    const filePath = path.join(questionsDir, file);
    if (!fs.existsSync(filePath)) continue;
    try {
      const module = await import(pathToFileURL(filePath).href);
      const quiz = Object.entries(module).find(([key]) => key.endsWith('_QUIZ'))?.[1];
      if (!quiz) continue;

      for (const item of quiz.mcq || []) {
        const normalized = normalizeMcq({ ...item, __origin: 'bank' }, topic);
        if (normalized) mcq.push(normalized);
      }
      for (const item of quiz.tf || []) {
        const normalized = normalizeTf({ ...item, __origin: 'bank' });
        if (normalized) tf.push(normalized);
      }
    } catch (err) {
      console.warn(`[exam] Không nạp được ngân hàng ${file}: ${err.message}`);
    }
  }

  return { mcq, tf };
}

/** Loại phần tử trùng theo khoá (giữ bản ghi đầu tiên) */
function dedupe(items, keyFn) {
  const seen = new Set();
  const output = [];
  let removed = 0;
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      removed += 1;
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return { list: output, removed };
}

/**
 * Nạp toàn bộ pool câu hỏi, dedupe cả 2 nguồn.
 *
 * Quy tắc dedupe:
 *  - Trắc nghiệm: theo nội dung đề bài sau khi bỏ tag "(Câu N)"
 *  - Đúng/Sai: theo nội dung tình huống
 *  Câu trùng giữa sourcedethi và ngân hàng web cũng bị loại.
 */
/** Đấu trường chỉ dùng nguồn C1–C7 và đúng/sai chung, không trộn ngân hàng web. */
export function loadBattleQuestionPool() {
  const stats = { files: [], missing: [] };
  const mcq = dedupe(loadSourceMcq(stats), item => normalizeKey(item.stem)).list;
  const tf = dedupe(loadSourceTf(stats, ['chung']).chung, item => normalizeKey(item.scenario)).list;
  if (stats.missing.length || mcq.length < 18 || tf.length < 2) {
    throw new Error('Battle source requires C1-C7, 18 unique MCQs and 2 common true/false questions');
  }
  return { mcq, tf, stats };
}

export async function loadQuestionPool() {
  const stats = { files: [], missing: [] };

  const sourceMcq = loadSourceMcq(stats);
  const sourceTf = loadSourceTf(stats);
  const bank = await loadBankQuestions();

  const mcqByTopic = {};
  const dedupeStats = {};

  // Dedupe PHẢI chạy toàn cục, không chỉ trong từng chủ đề.
  //
  // Nguồn thực tế có nhiều câu trùng nội dung nhưng bị xếp vào hai chủ đề
  // khác nhau (C1↔C5, C2↔C5, C2↔C3, C3↔C5, C4↔C5). Nếu chỉ dedupe theo
  // từng chủ đề thì một đề vẫn có thể bốc cùng một câu 2 lần — học viên
  // thấy câu lặp trong đề. Vì vậy dùng MỘT Set chung cho mọi chủ đề, và
  // giữ bản ghi ở chủ đề xuất hiện trước theo TOPIC_ORDER để ổn định.
  const seenStems = new Set();
  const excluded = [];

  for (const topic of Object.keys(SOURCE_BASENAMES).filter((key) => key.startsWith('C'))) {
    const fromSource = sourceMcq.filter((item) => item.topic === topic);
    const fromBank = bank.mcq.filter((item) => item.topic === topic);

    const list = [];
    let removed = 0;
    for (const item of [...fromSource, ...fromBank]) {
      const key = normalizeKey(item.stem);
      if (seenStems.has(key)) {
        removed += 1;
        excluded.push({ topic, stem: item.stem.slice(0, 60) });
        continue;
      }
      seenStems.add(key);
      list.push(item);
    }

    mcqByTopic[topic] = list;
    dedupeStats[topic] = {
      source: fromSource.length,
      bank: fromBank.length,
      unique: list.length,
      removed,
    };
  }

  if (excluded.length) {
    console.warn(
      `[exam] ⚠ Loại ${excluded.length} câu trùng nội dung giữa các chủ đề ` +
        '(giữ bản ghi ở chủ đề xuất hiện trước).',
    );
  }

  const tfCommon = dedupe(sourceTf.chung, (item) => normalizeKey(item.scenario));
  const tfCs = dedupe(
    [...sourceTf.cs, ...bank.tf],
    (item) => normalizeKey(item.scenario),
  );
  const tfIct = dedupe(
    [...sourceTf.ict, ...bank.tf],
    (item) => normalizeKey(item.scenario),
  );

  return {
    mcq: mcqByTopic,
    tf: {
      chung: tfCommon.list,
      cs: tfCs.list,
      ict: tfIct.list,
    },
    stats: {
      files: stats.files,
      missing: stats.missing,
      mcq: dedupeStats,
      tf: {
        chung: { unique: tfCommon.list.length, removed: tfCommon.removed },
        cs: { unique: tfCs.list.length, removed: tfCs.removed },
        ict: { unique: tfIct.list.length, removed: tfIct.removed },
      },
    },
    topics: TOPIC_ORDER,
  };
}
