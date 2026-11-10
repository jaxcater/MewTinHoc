import { BATTLE_DURATION } from './config.js';

export function validAnswer(question, value) {
  return question.type === 'mcq'
    ? Number.isInteger(value) && value >= 0 && value < 4
    : Array.isArray(value) && value.length === 4 && value.every(v => v === null || typeof v === 'boolean');
}
export function completeAnswer(question, value) {
  return validAnswer(question, value) && (question.type === 'mcq' || value.every(v => typeof v === 'boolean'));
}
export function answeredCount(room, player) {
  return room.exam.questions.filter(q => completeAnswer(q, player.answers[q.id]?.value)).length;
}
export function rankPlayers(room) {
  const scores = room.players.map(player => {
    let accuracyPoints = 0;
    let speedPoints = 0;
    let correctUnits = 0;
    for (const q of room.exam.questions) {
      const answer = player.answers[q.id];
      if (!answer) continue;
      const ratio = q.type === 'mcq' ? Number(answer.value === q.answer)
        : q.answer.reduce((sum, value, index) => sum + Number(answer.value[index] === value), 0) / 4;
      correctUnits += ratio;
      accuracyPoints += ratio * 100;
      // Cùng đáp án đúng: thời điểm nhận cuối cùng sớm hơn được nhiều điểm hơn.
      speedPoints += ratio * 30 * Math.max(0, 1 - (answer.at - room.startedAt) / BATTLE_DURATION);
    }
    return { id: player.id, name: player.name, avatar: player.avatar,
      score: accuracyPoints + speedPoints, accuracyPoints, speedPoints, correctUnits,
      submittedAt: player.submittedAt, autoSubmitted: player.autoSubmitted,
      completed: answeredCount(room, player) };
  });
  scores.sort((a, b) => b.score - a.score || a.submittedAt - b.submittedAt || a.id.localeCompare(b.id));
  const rewards = room.mode === 'private' ? [50, 20, 0] : [100, 50, 0];
  return scores.map((p, index) => ({ ...p, rank: index + 1, xp: rewards[index] }));
}
