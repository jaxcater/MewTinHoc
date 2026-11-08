import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Cố định data root trước khi import để không chạm ngân hàng/kho đề thật.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mew-exam-option-labels-'));
const previousRoot = process.env.EXAM_DATA_ROOT;
process.env.EXAM_DATA_ROOT = directory;
const { SOURCE_DIR, POOL_DIR, SESSION_DIR, PART_I_MATRIX, ensureDirs } = await import('./config.js');
const { stripOptionPrefix, loadQuestionPool } = await import('./questionPool.js');
const { buildExam } = await import('./builder.js');
const { gradeExam } = await import('./grading.js');
const { validatePool } = await import('./examService.js');
const { saveExamToPool, claimExam, readSession, gradeSubmission } = await import('./storage.js');
const { openJson } = await import('./crypto.js');
if (previousRoot === undefined) delete process.env.EXAM_DATA_ROOT;
else process.env.EXAM_DATA_ROOT = previousRoot;

after(() => {
  const tempRoot = path.resolve(os.tmpdir()) + path.sep;
  assert.ok(path.resolve(directory).startsWith(tempRoot));
  fs.rmSync(directory, { recursive: true, force: true });
});

function perfectAnswers(keyData) {
  return {
    partI: keyData.partI.map((q) => q.ans),
    partII: keyData.partII.map((q) => q.ans),
  };
}

test('bỏ các nhãn cũ và giữ nguyên nội dung, đường dẫn, giá trị số 0', () => {
  for (const prefix of ['A: ', 'b:', ' C： ', 'D. ', 'a) ', 'B : ']) {
    assert.equal(stripOptionPrefix(prefix + 'border-style / color'), 'border-style / color');
  }
  for (const content of ['C:\\Users\\file.txt', 'D:/data/file.txt', 'A && B', '192.168.1.1', '<a href="/">', 'color: red', 'C++']) {
    assert.equal(stripOptionPrefix(content), content);
  }
  assert.equal(stripOptionPrefix(0), '0');
});

let built;
let loadedPool;
test('nạp phương án chuỗi/object, đảo phương án và chấm đúng nội dung sau đảo', async () => {
  ensureDirs();
  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  const expectedCorrect = new Map();
  const sourceStems = new Set();
  for (const [topic, count] of Object.entries(PART_I_MATRIX)) {
    const records = Array.from({ length: count }, (_, index) => {
      const stem = `Câu kiểm tra nhãn ${topic} số ${index}?`;
      sourceStems.add(stem);
      expectedCorrect.set(stem, 'Nội dung đúng');
      return {
        cau_hoi: stem,
        phuong_an: index % 2 === 0
          ? ['A: Sai thứ nhất', 'B： Sai thứ hai', 'C. Nội dung đúng', 'D) Sai thứ ba']
          : [{ text: 'A: Sai thứ nhất' }, { noi_dung: 'B： Sai thứ hai' }, { label: 'C. Nội dung đúng' }, { text: 'D) Sai thứ ba' }],
        dap_an: 'Đáp án C',
      };
    });
    fs.writeFileSync(path.join(SOURCE_DIR, `${topic}.json`), JSON.stringify(records));
  }
  for (const bucket of ['Chung', 'CS', 'ICT']) {
    const records = [1, 2].map((index) => ({
      tinh_huong: `Tình huống kiểm tra nhãn ${bucket} số ${index}`,
      cac_menh_de: ['a', 'b', 'c', 'd'].map((key, i) => ({
        ky_hieu: key, phat_bieu: `Mệnh đề kiểm tra ${key}`, dap_an: i % 2 === 0,
      })),
    }));
    fs.writeFileSync(path.join(SOURCE_DIR, `dungsai${bucket}.json`), JSON.stringify(records));
  }
  const pool = await loadQuestionPool();
  loadedPool = pool;
  const sourceQuestions = Object.values(pool.mcq).flat().filter((q) => sourceStems.has(q.stem));
  assert.equal(sourceQuestions.length, 24);
  for (const q of sourceQuestions) {
    assert.deepEqual(q.options, ['Sai thứ nhất', 'Sai thứ hai', 'Nội dung đúng', 'Sai thứ ba']);
    assert.equal(q.ans, 2);
  }

  // Dùng đúng builder với nguồn đã chuẩn hoá, kiểm tra cả hai định hướng.
  const sourcePool = { ...pool, mcq: Object.fromEntries(Object.keys(PART_I_MATRIX).map((topic) => [
    topic, sourceQuestions.filter((q) => q.topic === topic),
  ])) };
  for (const track of ['ict', 'cs']) {
    built = buildExam(sourcePool, track);
    const { publicExam, keyData } = built;
    assert.equal(publicExam.partI.length, 24);
    assert.equal(publicExam.partII.length, 4);
    assert.equal('keyData' in publicExam, false);
    publicExam.partI.forEach((q, i) => {
      assert.deepEqual(Object.keys(q).sort(), ['no', 'options', 'stem', 'topic']);
      assert.equal(q.options[keyData.partI[i].ans], expectedCorrect.get(q.stem));
      assert.ok(q.options.every((option) => !/^[A-D]\s*[.):：]/i.test(option)));
    });
    assert.equal(gradeExam(publicExam, keyData, perfectAnswers(keyData)).totalScore, 10);
  }
});

test('văn bản có nhãn nhận cả A:, B：, C. và D)', async (t) => {
  const stem = 'Câu hỏi văn bản dùng nhãn dấu hai chấm?';
  t.after(() => fs.unlinkSync(path.join(SOURCE_DIR, 'C1.txt')));
  fs.writeFileSync(path.join(SOURCE_DIR, 'C1.txt'), [
    `Câu hỏi: ${stem}`, 'A: Sai thứ nhất', 'B： Sai thứ hai',
    'C. Sai thứ ba', 'D) Nội dung đúng', 'Đáp án: D',
  ].join('\n'));
  const pool = await loadQuestionPool();
  const question = pool.mcq.C1.find((q) => q.stem === stem);
  assert.ok(question);
  assert.deepEqual(question.options, ['Sai thứ nhất', 'Sai thứ hai', 'Sai thứ ba', 'Nội dung đúng']);
  assert.equal(question.ans, 3);
});

test('claim và chấm đề cũ bỏ nhãn trong RAM, giữ chỉ số đáp án và file mã hoá', () => {
  const legacy = structuredClone(built);
  legacy.publicExam.examId = crypto.randomUUID();
  legacy.publicExam.partI.forEach((q) => {
    // Nhãn cũ đã bị đảo thứ tự như trong ảnh người dùng.
    q.options = q.options.map((text, i) => `${['C', 'D', 'B', 'A'][i]}: ${text}`);
  });
  const fileName = saveExamToPool(legacy);
  const before = fs.readFileSync(path.join(POOL_DIR, fileName));
  assert.equal(before.subarray(0, 4).toString(), 'MTH1');
  const claimed = claimExam(legacy.publicExam.track);
  assert.ok(claimed);
  assert.deepEqual(claimed.publicExam.partI, built.publicExam.partI);
  assert.equal('keyData' in claimed, false);
  const sessionFile = path.join(SESSION_DIR, `${claimed.examId}.dat`);
  assert.deepEqual(fs.readFileSync(sessionFile), before);
  assert.deepEqual(openJson(before).keyData, legacy.keyData);
  assert.deepEqual(readSession(claimed.examId).keyData, legacy.keyData);
  const graded = gradeSubmission(claimed.examId, perfectAnswers(legacy.keyData));
  assert.equal(graded.result.totalScore, 10);
  assert.deepEqual(graded.publicExam.partI, built.publicExam.partI);
});

test('tương thích pool và session JSON cũ có nhãn phương án', () => {
  const legacy = structuredClone(built);
  legacy.publicExam.examId = crypto.randomUUID();
  legacy.publicExam.partI.forEach((q) => {
    q.options = q.options.map((text, i) => `${['D', 'A', 'C', 'B'][i]}： ${text}`);
  });
  fs.writeFileSync(path.join(POOL_DIR, `${legacy.publicExam.track}-${legacy.publicExam.examId}.json`), JSON.stringify(legacy));
  const claimed = claimExam(legacy.publicExam.track);
  assert.deepEqual(claimed.publicExam.partI, built.publicExam.partI);
  legacy.publicExam.examId = crypto.randomUUID();
  fs.writeFileSync(path.join(SESSION_DIR, `${legacy.publicExam.examId}.json`), JSON.stringify(legacy));
  const graded = gradeSubmission(legacy.publicExam.examId, perfectAnswers(legacy.keyData));
  assert.equal(graded.result.totalScore, 10);
  assert.deepEqual(graded.publicExam.partI, built.publicExam.partI);
  assert.deepEqual(graded.keyData, legacy.keyData);
});

test('kiểm tra deploy bắt nguồn thiếu/rỗng/hỏng dù ngân hàng fallback vẫn đủ', () => {
  assert.deepEqual(validatePool(loadedPool, { requireSourceFiles: true }).problems, []);
  for (const failure of ['missing', 'empty', 'rejected']) {
    const pool = structuredClone(loadedPool);
    const file = pool.stats.files.find((item) => item.topic === 'C2');
    if (failure === 'missing') pool.stats.files = pool.stats.files.filter((item) => item !== file);
    if (failure === 'empty') file.accepted = 0;
    if (failure === 'rejected') file.rejected = 1;
    assert.deepEqual(validatePool(pool).problems, []);
    assert.ok(validatePool(pool, { requireSourceFiles: true }).problems.some((message) => message.includes('C2')));
  }
});

function checkDeploy() {
  return spawnSync(process.execPath, [fileURLToPath(new URL('./worker.js', import.meta.url)), '--check', '--strict'], {
    encoding: 'utf8', env: { ...process.env, EXAM_DATA_ROOT: directory },
  });
}

test('lệnh kiểm tra deploy trả thành công với nguồn hợp lệ và chặn .txt che .json', (t) => {
  const valid = checkDeploy();
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  fs.copyFileSync(path.join(SOURCE_DIR, 'C1.json'), path.join(SOURCE_DIR, 'C1.txt'));
  t.after(() => fs.unlinkSync(path.join(SOURCE_DIR, 'C1.txt')));
  const ambiguous = checkDeploy();
  assert.equal(ambiguous.status, 1, ambiguous.stdout + ambiguous.stderr);
  assert.match(ambiguous.stdout, /cùng tồn tại \.txt và \.json/);
});

test('lệnh kiểm tra deploy trả mã lỗi khi file nguồn không đọc được thành câu hỏi', (t) => {
  const sourceFile = path.join(SOURCE_DIR, 'C2.json');
  const original = fs.readFileSync(sourceFile);
  t.after(() => fs.writeFileSync(sourceFile, original));
  fs.writeFileSync(sourceFile, '{broken-json');
  const broken = checkDeploy();
  assert.equal(broken.status, 1, broken.stdout + broken.stderr);
  assert.match(broken.stdout, /Nguồn C2: thiếu file hoặc không có câu hỏi đọc được/);
});
