import { randomInt, randomUUID } from 'node:crypto';

export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildBattleExam(pool) {
  if (pool.mcq.length < 18 || pool.tf.length < 2) throw new Error('Insufficient battle questions');
  const questions = [
    ...shuffle(pool.mcq).slice(0, 18).map(q => {
      const order = shuffle([0, 1, 2, 3]);
      return { type: 'mcq', topic: q.topic, stem: q.stem,
        options: order.map(i => q.options[i]), answer: order.indexOf(q.ans) };
    }),
    ...shuffle(pool.tf).slice(0, 2).map(q => ({ type: 'tf', stem: q.scenario,
      statements: q.statements.map(s => s.text), answer: q.statements.map(s => s.ans) })),
  ];
  return { id: randomUUID(), questions: shuffle(questions).map((q, index) => ({ ...q, id: String(index + 1) })) };
}

/** Danh sách cho client dùng allowlist, tuyệt đối không gửi đáp án. */
export function publicQuestions(exam) {
  return exam.questions.map(q => q.type === 'mcq'
    ? { id: q.id, type: q.type, stem: q.stem, options: q.options }
    : { id: q.id, type: q.type, stem: q.stem, statements: q.statements });
}
