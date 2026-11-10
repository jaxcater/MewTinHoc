import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildBattleExam, publicQuestions } from './builder.js';
import { createBattleService } from './service.js';
import { createBattleStorage } from './storage.js';
import { BATTLE_DURATION } from './config.js';

const source = {
  mcq: Array.from({ length: 70 }, (_, i) => ({ topic: `C${i % 7 + 1}`, stem: `Câu hỏi kiến thức ${i}`,
    options: ['Đáp án đúng', 'Sai một', 'Sai hai', 'Sai ba'], ans: 0 })),
  tf: Array.from({ length: 12 }, (_, i) => ({ scenario: `Tình huống thực tế ${i}`,
    statements: [true, false, true, false].map((ans, j) => ({ text: `Ý ${j}`, ans })) })),
};

function harness(options = {}) {
  let time = 1_800_000_000_000;
  let taken = 0;
  const saved = new Map();
  const exam = buildBattleExam(source);
  const storage = { init() {}, list: () => [...saved.keys()], read: (_, id) => structuredClone(saved.get(id)),
    write: (_, id, data) => saved.set(id, structuredClone(data)), remove: (_, id) => saved.delete(id),
    take: () => { taken++; return structuredClone(exam); } };
  const opts = { now: () => time, ...options };
  const service = createBattleService(storage, opts);
  const enter = (id, mode = 'random', code) => service.enter(id, mode, { name: id }, code);
  function start(mode = 'random') {
    const room = enter('a', mode);
    enter('b', mode === 'private' ? 'join' : 'random', room.code);
    enter('c', mode === 'private' ? 'join' : 'random', room.code);
    for (const id of ['a', 'b', 'c']) service.mutate(id, 'ready', { roomId: room.id, ready: true });
    time += 3000;
    return service.state('a');
  }
  function fill(id, revision = 1) {
    const room = service.state(id);
    for (const q of exam.questions) service.mutate(id, 'answer', { roomId: room.id, questionId: q.id, value: q.answer, revision });
  }
  return { service, storage, opts, enter, start, fill, exam, saved, advance: delta => { time += delta; }, taken: () => taken };
}

test('mỗi đề có đúng 18 MCQ + 2 TF, trộn cả hai loại, giữ ánh xạ đáp án', () => {
  const positions = new Set();
  for (let n = 0; n < 30; n++) {
    const exam = buildBattleExam(source);
    assert.equal(exam.questions.length, 20);
    assert.equal(new Set(exam.questions.map(q => q.stem)).size, 20);
    assert.equal(exam.questions.filter(q => q.type === 'tf').length, 2);
    for (const [index, q] of exam.questions.entries()) {
      if (q.type === 'mcq') assert.equal(q.options[q.answer], 'Đáp án đúng');
      else { positions.add(index); assert.equal(q.statements.length, 4); }
    }
    assert.ok(publicQuestions(exam).every(q => !('answer' in q) && !('ans' in q)));
  }
  assert.ok(positions.size > 5);
});

test('chỉ đọc C1–C7 và dungsaiChung, không cần đúng/sai chuyên ngành hoặc fallback web', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mew-battle-source-'));
  try {
    const dir = path.join(root, 'sourcedethi'); fs.mkdirSync(dir);
    for (let i = 1; i <= 7; i++) fs.writeFileSync(path.join(dir, `C${i}.json`), JSON.stringify(source.mcq.filter(q => q.topic === `C${i}`).map(q => ({ ...q, q: q.stem }))));
    fs.writeFileSync(path.join(dir, 'dungsaiChung.json'), JSON.stringify(source.tf));
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      "const {loadBattleQuestionPool}=await import('./server/exam/questionPool.js');const p=loadBattleQuestionPool();console.log(JSON.stringify({mcq:p.mcq.length,tf:p.tf.length,files:p.stats.files.map(f=>f.topic)}));"],
    { cwd: process.cwd(), env: { ...process.env, EXAM_DATA_ROOT: root }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(result.stdout.trim());
    assert.equal(data.mcq, 70); assert.equal(data.tf, 12);
    assert.deepEqual(data.files.sort(), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'chung']);
    // Kiểm tra bù đúng 100, không tăng khi chạy lại, rồi bù lại sau một lần lấy.
    const refill = spawnSync(process.execPath, ['--input-type=module', '-e',
      "const {createBattleStorage}=await import('./server/battle/storage.js');const s=createBattleStorage();s.refill();if(s.list('pool').length!==100)throw Error('target');s.refill();if(s.list('pool').length!==100)throw Error('duplicate');s.take();if(s.list('pool').length!==99)throw Error('take');s.refill();if(s.list('pool').length!==100)throw Error('refill');"],
    { cwd: process.cwd(), env: { ...process.env, EXAM_DATA_ROOT: root }, encoding: 'utf8' });
    assert.equal(refill.status, 0, refill.stderr);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('chỉ phát một đề khi đủ 3 người sẵn sàng, mọi người nhận giống nhau', () => {
  const h = harness();
  const r = h.enter('a'); h.enter('b');
  h.service.mutate('a', 'ready', { roomId: r.id, ready: true });
  h.service.mutate('b', 'ready', { roomId: r.id, ready: true });
  assert.equal(h.service.state('a').status, 'waiting');
  h.enter('c');
  for (const id of ['a', 'b', 'c', 'c']) h.service.mutate(id, 'ready', { roomId: r.id, ready: true });
  assert.equal(h.taken(), 1);
  assert.deepEqual(h.service.state('a').questions, h.service.state('b').questions);
  assert.equal(h.service.state('a').deadline - h.service.state('a').startedAt, BATTLE_DURATION);
  assert.throws(() => h.service.mutate('a', 'answer', { roomId: r.id, questionId: '1', value: 0, revision: 1 }), { code: 'NOT_STARTED' });
  assert.notEqual(h.enter('d').id, r.id);
});

test('mã riêng thay mới khi chủ phòng thoát; mã cũ không dùng được', () => {
  const h = harness(); const first = h.enter('a', 'private');
  h.enter('b', 'join', first.code);
  h.service.leave('a', first.id);
  assert.equal(h.service.state('b'), null);
  assert.throws(() => h.enter('c', 'join', first.code), { code: 'ROOM_GONE' });
  const second = h.enter('a', 'private');
  assert.notEqual(first.code, second.code);
  h.service.leave('a', first.id);
  assert.equal(h.service.state('a').id, second.id);
});

test('không đọc/ghi phòng người khác, không join quá 3 người', () => {
  const h = harness(); const first = h.enter('a', 'private');
  h.enter('b', 'join', first.code); h.enter('c', 'join', first.code);
  assert.throws(() => h.enter('d', 'join', first.code), { code: 'ROOM_FULL' });
  assert.throws(() => h.service.mutate('d', 'ready', { roomId: first.id, ready: true }), { code: 'ROOM_GONE' });
  assert.throws(() => h.service.mutate('a', 'ready', { roomId: 'other', ready: true }), { code: 'ROOM_GONE' });
});

test('chặn nộp thiếu câu/ý, không lộ lựa chọn đối thủ; retry không thay thời gian', () => {
  const h = harness(); const room = h.start();
  assert.throws(() => h.service.mutate('a', 'submit', { roomId: room.id }), { code: 'INCOMPLETE' });
  const tf = h.exam.questions.find(q => q.type === 'tf');
  const write = (value, revision) => h.service.mutate('a', 'answer', { roomId: room.id, questionId: tf.id, value, revision });
  write([true, null, false, null], 1);
  assert.equal(h.service.state('a').players[0].completed, 0);
  assert.deepEqual(h.service.state('b').answers, {});
  const firstAt = h.service.state('a').answers[tf.id].at;
  h.advance(1000); write([true, null, false, null], 2);
  assert.equal(h.service.state('a').answers[tf.id].at, firstAt);
  write([false, null, false, null], 3);
  assert.ok(h.service.state('a').answers[tf.id].at > firstAt);
  write([true, null, false, null], 1);
  assert.equal(h.service.state('a').answers[tf.id].value[0], false);
  assert.throws(() => write([true], 4), { code: 'INVALID_ANSWER' });
});

test('cùng đáp án thì người nhanh hơn thắng; chỉ hiện kết quả khi tất cả nộp', async () => {
  let awards = 0;
  const h = harness({ reward: async () => { awards++; return true; } });
  const room = h.start();
  for (const id of ['a', 'b', 'c']) {
    h.fill(id); h.advance(10000);
    const state = h.service.mutate(id, 'submit', { roomId: room.id });
    assert.equal(state.status, id === 'c' ? 'finished' : 'playing');
    if (id !== 'c') assert.equal(state.results, null);
  }
  const result = h.service.state('a');
  assert.deepEqual(result.results.map(p => p.id), ['a', 'b', 'c']);
  assert.deepEqual(result.results.map(p => p.xp), [100, 50, 0]);
  assert.ok(result.results[0].score > result.results[1].score);
  assert.throws(() => h.service.mutate('a', 'answer', { roomId: room.id }), { code: 'MATCH_CLOSED' });
  h.service.mutate('a', 'submit', { roomId: room.id });
  await h.service.tick(); await h.service.tick();
  assert.equal(awards, 1);
  h.service.leave('a', room.id);
  const restored = createBattleService(h.storage, h.opts);
  assert.equal(restored.state('a'), null);
});

test('hết 15 phút tự nộp cả bài trống, phục hồi trận sau restart', async () => {
  const h = harness(); const room = h.start(); h.fill('a');
  h.service.leave('a', room.id);
  assert.equal(h.service.state('a').status, 'playing');
  const restored = createBattleService(h.storage, h.opts);
  assert.equal(Object.keys(restored.state('a').answers).length, 20);
  h.advance(BATTLE_DURATION);
  await restored.tick();
  const state = restored.state('b');
  assert.equal(state.status, 'finished');
  assert.ok(state.players.every(p => p.submitted && p.autoSubmitted));
  assert.equal(state.results.find(p => p.id === 'b').score, 0);
});

test('phòng riêng thưởng 50/20/0 cho cả chủ phòng và người tham gia, giữ khoản thưởng sau restart', async () => {
  let paid;
  const h = harness({ reward: async room => { paid = room.results; return true; } });
  const room = h.start('private');
  // Người tham gia thắng, chủ phòng hạng ba: thưởng theo hạng của cả phòng.
  for (const id of ['b', 'c', 'a']) {
    h.fill(id); h.advance(10000);
    h.service.mutate(id, 'submit', { roomId: room.id });
  }
  const restored = createBattleService(h.storage, h.opts);
  assert.deepEqual(restored.state('a').results.map(p => [p.id, p.xp]), [['b', 50], ['c', 20], ['a', 0]]);
  await restored.tick();
  assert.deepEqual(paid.map(p => p.xp), [50, 20, 0]);
  assert.equal(restored.state('b').rewardStatus, 'paid');
});

test('phòng chờ hết heartbeat được giải phóng', async () => {
  const h = harness(); h.enter('a', 'private'); h.advance(121000); await h.service.tick();
  assert.equal(h.service.state('a'), null);
});

test('hết lượt nhận 0 EXP vẫn giữ điểm/hạng trận; lưu biên nhận sau restart và không trả lại', async () => {
  let awards = 0;
  const h = harness({ reward: async room => {
    awards++;
    assert.deepEqual(room.results.map(p => p.xp), [50, 20, 0]);
    return { players: [
      { id: room.results[0].id, awardedXp: 0, limitReached: true, used: 10 },
      { id: room.results[1].id, awardedXp: 20, limitReached: false, used: 1 },
    ] };
  } });
  const room = h.start('private');
  for (const id of ['a', 'b', 'c']) {
    h.fill(id); h.advance(10000);
    h.service.mutate(id, 'submit', { roomId: room.id });
  }
  const before = h.service.state('a').results;
  await h.service.tick();
  const settled = h.service.state('a');
  assert.equal(settled.rewardStatus, 'paid');
  assert.deepEqual(settled.results.map(p => p.awardedXp), [0, 20, 0]);
  assert.equal(settled.results[0].rewardLimitReached, true);
  assert.equal(settled.results[1].rewardUsed, 1);
  assert.deepEqual(settled.results.map(p => [p.rank, p.score]), before.map(p => [p.rank, p.score]));
  const restored = createBattleService(h.storage, h.opts);
  await restored.tick();
  assert.equal(awards, 1);
  assert.equal(restored.state('a').results[0].awardedXp, 0);
  h.service.leave('a', room.id);
  assert.notEqual(h.enter('a', 'private').id, room.id);
});

test('lỗi ghi không làm thay đổi câu trả lời trong RAM', () => {
  const h = harness(); const room = h.start();
  h.storage.write = () => { throw Object.assign(new Error('Disk denied'), { code: 'EACCES' }); };
  const q = h.exam.questions[0];
  assert.throws(() => h.service.mutate('a', 'answer', { roomId: room.id, questionId: q.id, value: q.answer, revision: 1 }), { code: 'EACCES' });
  assert.deepEqual(h.service.state('a').answers, {});
});

test('file mã hoá, đổi khoá không giải mã được và file vẫn nguyên', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mew-battle-'));
  try {
    const storage = createBattleStorage(root); storage.init();
    const exam = buildBattleExam(source); storage.write('pool', exam.id, exam);
    const target = path.join(root, 'pool', `${exam.id}.dat`);
    const buffer = fs.readFileSync(target);
    assert.equal(buffer.subarray(0, 4).toString(), 'MTB1');
    assert.equal(buffer.includes(Buffer.from('Đáp án đúng')), false);
    assert.deepEqual(storage.read('pool', exam.id), exam);
    fs.writeFileSync(path.join(root, '.key-secret'), Buffer.alloc(32, 5));
    assert.throws(() => createBattleStorage(root).read('pool', exam.id));
    assert.deepEqual(fs.readFileSync(target), buffer);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
