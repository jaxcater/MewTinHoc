// ============================================================
//  Builder: từ pool câu hỏi → 1 đề hoàn chỉnh
//
//   - Chọn câu theo ma trận Phần I, xoay vòng để các đề liên tiếp
//     không lặp lại cùng một bộ câu
//   - NẾU một chủ đề thiếu câu: tái phân bổ sang chủ đề còn dư
//     thay vì làm sập hệ thống (cập nhật dữ liệu nguồn không làm chết web)
//   - ĐẢO PHƯƠNG ÁN + remap đáp án (nguồn cũ có 89% đáp án là A)
//   - Tách bản PUBLIC (gửi browser, không có đáp án) và bản KEY (server giữ)
// ============================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  DATA_ROOT,
  DURATION_MINUTES,
  PART_II_COMMON_COUNT,
  PART_II_TOTAL,
  PART_II_TRACK_COUNT,
  PART_I_MATRIX,
  PART_I_TOTAL,
  ROTATION_FILE,
  TOPIC_ORDER,
} from './config.js';

/** Fisher–Yates, không phụ thuộc sort(() => Math.random()-0.5) */
export function shuffle(items, random = Math.random) {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

/** Con trỏ xoay vòng theo từng chủ đề, lưu trên đĩa để sống sót qua restart */
function readRotation() {
  try {
    return JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeRotation(rotation) {
  try {
    fs.writeFileSync(ROTATION_FILE, JSON.stringify(rotation, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[exam] Không ghi được rotation: ${err.message}`);
  }
}

/**
 * Lập kế hoạch số câu mỗi chủ đề cho MỘT đề.
 *
 * Bắt đầu từ PART_I_MATRIX. Chủ đề nào thiếu câu thì bỏ phần thiếu,
 * rồi chia phần còn thiếu cho các chủ đề còn dư (ưu tiên chủ đề
 * nhiều câu nhất, để mỗi chủ đề vẫn xuất hiện ít nhất 1 lần nếu có thể).
 *
 * Không bao giờ ném lỗi vì thiếu câu — chỉ ném lỗi khi tổng số câu
 * của cả 7 chủ đề không đủ 24.
 *
 * @returns {{plan: Record<string, number>, reallocated: string[]}}
 */
export function planPartI(pool) {
  const plan = {};
  const capacity = {};
  const reallocated = [];

  for (const topic of Object.keys(PART_I_MATRIX)) {
    const available = pool.mcq?.[topic]?.length || 0;
    capacity[topic] = available;
    const wanted = PART_I_MATRIX[topic];
    plan[topic] = Math.min(wanted, available);
    if (plan[topic] < wanted) {
      reallocated.push(
        `${topic}: cần ${wanted}, chỉ có ${available} → lấy ${plan[topic]}`,
      );
    }
  }

  let deficit = PART_I_TOTAL - Object.values(plan).reduce((a, b) => a + b, 0);

  // Chia phần thiếu cho chủ đề còn dư, lặp tới khi hết thiếu hoặc hết chỗ
  while (deficit > 0) {
    const candidates = TOPIC_ORDER.filter((topic) => plan[topic] < capacity[topic])
      // Ưu tiên chủ đề còn nhiều câu dư nhất
      .sort((a, b) => capacity[b] - plan[b] - (capacity[a] - plan[a]));

    if (candidates.length === 0) break;

    // Chia đều 1 câu mỗi lượt cho các chủ đề còn chỗ
    for (const topic of candidates) {
      if (deficit === 0) break;
      if (plan[topic] >= capacity[topic]) continue;
      plan[topic] += 1;
      deficit -= 1;
    }
  }

  return { plan, reallocated, deficit };
}

/**
 * Bốc `count` câu từ pool theo kiểu xoay vòng.
 * Nhờ con trỏ, đề thứ 1 lấy câu 0..n, đề thứ 2 lấy câu n..2n → tối đa hoá
 * độ phủ trước khi phải tái sử dụng câu.
 *
 * Khi count > pool.length (đề cần nhiều câu hơn số câu có), câu sẽ quay vòng
 * và lặp lại — nhưng planPartI đã đảm bảo count <= pool.length.
 */
function takeRotating(pool, count, cursorKey, rotation) {
  if (count <= 0) return [];
  if (pool.length === 0) return [];

  const start = Number(rotation[cursorKey] || 0) % pool.length;
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    picked.push(pool[(start + i) % pool.length]);
  }
  rotation[cursorKey] = (start + count) % pool.length;
  return picked;
}

/**
 * Đảo phương án của 1 câu trắc nghiệm và tính lại chỉ số đáp án.
 */
function shuffleOptions(item, random) {
  const indexed = item.options.map((text, index) => ({ text, index }));
  const shuffled = shuffle(indexed, random);
  const newAns = shuffled.findIndex((option) => option.index === item.ans);
  return {
    options: shuffled.map((option) => option.text),
    // Nếu vì lý do nào đó không tìm thấy, giữ 0 để không trả về -1
    ans: newAns >= 0 ? newAns : 0,
  };
}

/** Chuẩn hoá text lần cuối trước khi trả ra client */
function cleanText(text) {
  return String(text ?? '').replace(/\r\n/g, '\n').trim();
}

/**
 * Sinh 1 đề hoàn chỉnh.
 * @param {object} pool      kết quả loadQuestionPool()
 * @param {'ict'|'cs'} track định hướng
 * @returns {{publicExam: object, keyData: object, meta: object}}
 */
export function buildExam(pool, track) {
  if (track !== 'ict' && track !== 'cs') {
    throw new Error(`Định hướng không hợp lệ: ${track}`);
  }

  const random = Math.random;
  const rotation = readRotation();
  const id = crypto.randomUUID();

  // ---------- PHẦN I ----------
  const { plan, reallocated, deficit } = planPartI(pool);

  if (deficit > 0) {
    throw new Error(
      `Kho câu hỏi không đủ ${PART_I_TOTAL} câu cho Phần I ` +
        `(thiếu ${deficit} câu). Cần bổ sung thêm câu hỏi.`,
    );
  }

  const partI = [];
  for (const topic of TOPIC_ORDER) {
    const count = plan[topic] || 0;
    if (count === 0) continue;
    const picked = takeRotating(pool.mcq[topic], count, `mcq:${topic}`, rotation);
    for (const item of picked) {
      const { options, ans } = shuffleOptions(item, random);
      partI.push({
        topic,
        stem: cleanText(item.stem),
        options: options.map(cleanText),
        ans,
        exp: cleanText(item.exp),
      });
    }
  }

  // Xáo thứ tự để các chủ đề không nằm thành khối liền nhau
  const orderedPartI = shuffle(partI, random);

  // ---------- PHẦN II ----------
  const commonPool = pool.tf.chung || [];
  const trackPool = pool.tf[track] || [];

  if (commonPool.length < PART_II_COMMON_COUNT) {
    throw new Error(
      `Kho đúng/sai chung không đủ: cần ${PART_II_COMMON_COUNT}, có ${commonPool.length}`,
    );
  }
  if (trackPool.length < PART_II_TRACK_COUNT) {
    throw new Error(
      `Kho đúng/sai ${track.toUpperCase()} không đủ: ` +
        `cần ${PART_II_TRACK_COUNT}, có ${trackPool.length}`,
    );
  }

  const commonPicked = takeRotating(
    commonPool,
    PART_II_COMMON_COUNT,
    'tf:chung',
    rotation,
  );
  const trackPicked = takeRotating(
    trackPool,
    PART_II_TRACK_COUNT,
    `tf:${track}`,
    rotation,
  );

  const partII = [...commonPicked, ...trackPicked].map((item) => {
    // Đảo thứ tự mệnh đề: nội dung và đáp án đi cùng nhau nên vẫn đúng
    const statements = shuffle(item.statements, random);
    return {
      scenario: cleanText(item.scenario),
      statements: statements.map((statement) => ({
        text: cleanText(statement.text),
        ans: statement.ans,
        exp: cleanText(statement.exp),
      })),
    };
  });

  writeRotation(rotation);

  // ---------- Bản PUBLIC: tuyệt đối không chứa đáp án ----------
  const publicExam = {
    examId: id,
    track,
    durationMinutes: DURATION_MINUTES,
    partI: orderedPartI.map((item, index) => ({
      no: index + 1,
      topic: item.topic,
      stem: item.stem,
      options: item.options,
    })),
    partII: partII.map((item, index) => ({
      no: index + 1,
      scenario: item.scenario,
      statements: item.statements.map((statement, statementIndex) => ({
        key: 'abcd'[statementIndex],
        text: statement.text,
      })),
    })),
  };

  // ---------- Bản KEY: chỉ nằm trên server ----------
  const keyData = {
    examId: id,
    track,
    createdAt: new Date().toISOString(),
    partI: orderedPartI.map((item) => ({
      ans: item.ans,
      exp: item.exp,
    })),
    partII: partII.map((item) => ({
      ans: item.statements.map((statement) => statement.ans),
      exp: item.statements.map((statement) => statement.exp),
    })),
  };

  const meta = {
    examId: id,
    track,
    plan,
    reallocated,
    partICount: orderedPartI.length,
    partIICount: partII.length,
  };

  return { publicExam, keyData, meta };
}

/**
 * Mô tả kho câu hỏi dạng text để log.
 * Ghi rõ chủ đề nào thiếu so với ma trận mong muốn.
 */
export function describePool(pool) {
  const lines = [];

  for (const topic of Object.keys(PART_I_MATRIX)) {
    const available = pool.mcq?.[topic]?.length || 0;
    const need = PART_I_MATRIX[topic];
    const mark = available >= need ? '✓' : available > 0 ? '~' : '✗';
    const note =
      available >= need
        ? ''
        : available > 0
          ? `  (thiếu ${need - available}, sẽ tái phân bổ)`
          : '  (KHÔNG CÓ CÂU — sẽ tái phân bổ)';
    lines.push(
      `  ${mark} ${topic.padEnd(3)} ${String(available).padStart(3)} câu` +
        ` | cần ${String(need).padStart(2)}/đề${note}`,
    );
  }

  lines.push(`  ✓ Đ/S chung ${String(pool.tf.chung?.length || 0).padStart(3)} câu | cần 2/đề`);
  lines.push(`  ✓ Đ/S CS    ${String(pool.tf.cs?.length || 0).padStart(3)} câu | cần 2/đề`);
  lines.push(`  ✓ Đ/S ICT   ${String(pool.tf.ict?.length || 0).padStart(3)} câu | cần 2/đề`);

  return lines.join('\n');
}

export { DATA_ROOT, PART_II_TOTAL };
