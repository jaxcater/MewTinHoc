// ============================================================
//  Chấm điểm đề thi thử Tin học THPTQG (chuẩn 10 điểm)
//   Phần I:  24 câu × 0,25đ = 6,0đ
//   Phần II: mỗi câu 4 ý, số ý đúng → 0 / 0,1 / 0,25 / 0,5 / 1,0
//            4 câu × 1,0đ = 4,0đ
//   Tổng tối đa: 10,0đ
//
//  Lưu ý: KHÔNG tái dùng công thức của StationQuizView
//  (correctCount / totalItems * 10) — đó là công thức cho quiz chủ đề.
// ============================================================
import { SCORING } from './config.js';

/** Quy đổi số ý đúng của 1 câu Phần II thành điểm */
export function partIIScore(correctStatements) {
  const index = Math.max(0, Math.min(4, Number(correctStatements) || 0));
  return SCORING.partIITiers[index];
}

/**
 * Chấm bài.
 * @param {object} publicExam  đề đã phát cho học viên
 * @param {object} keyData     đáp án server giữ
 * @param {{partI: number[], partII: boolean[][]}} answers
 * @returns kết quả chi tiết, bao gồm đáp án đúng + giải thích
 */
export function gradeExam(publicExam, keyData, answers) {
  const submittedPartI = Array.isArray(answers?.partI) ? answers.partI : [];
  const submittedPartII = Array.isArray(answers?.partII) ? answers.partII : [];

  const partIDetails = [];
  let partICorrect = 0;

  publicExam.partI.forEach((question, index) => {
    const submitted = submittedPartI[index];
    const correctAnswer = keyData.partI[index]?.ans;
    const isCorrect = Number.isInteger(submitted) && submitted === correctAnswer;
    if (isCorrect) partICorrect += 1;

    partIDetails.push({
      no: question.no,
      topic: question.topic,
      submitted: Number.isInteger(submitted) ? submitted : null,
      correctAnswer,
      isCorrect,
      exp: keyData.partI[index]?.exp || '',
    });
  });

  const partIISubDetails = [];
  let partIIScoreTotal = 0;

  publicExam.partII.forEach((question, index) => {
    const submittedRow = Array.isArray(submittedPartII[index]) ? submittedPartII[index] : [];
    const correctRow = keyData.partII[index]?.ans || [];

    const statements = question.statements.map((statement, statementIndex) => {
      const submitted = submittedRow[statementIndex];
      const correct = correctRow[statementIndex];
      const isCorrect = typeof submitted === 'boolean' && submitted === correct;
      return {
        key: statement.key,
        submitted: typeof submitted === 'boolean' ? submitted : null,
        correct,
        isCorrect,
        exp: keyData.partII[index]?.exp?.[statementIndex] || '',
      };
    });

    const correctStatementCount = statements.filter((item) => item.isCorrect).length;
    const earned = partIIScore(correctStatementCount);
    partIIScoreTotal += earned;

    partIISubDetails.push({
      no: question.no,
      statements,
      correctStatementCount,
      earned,
    });
  });

  const partIScore = Number((partICorrect * SCORING.partIPerQuestion).toFixed(2));
  const totalScore = Number((partIScore + partIIScoreTotal).toFixed(2));

  const totalQuestions = publicExam.partI.length + publicExam.partII.length; // 28
  const totalStatements = publicExam.partII.reduce(
    (sum, question) => sum + question.statements.length,
    0,
  );
  const correctStatementTotal = partIISubDetails.reduce(
    (sum, question) => sum + question.correctStatementCount,
    0,
  );
  const gradedItems = publicExam.partI.length + totalStatements; // 24 + 16 = 40
  const correctItems = partICorrect + correctStatementTotal;

  return {
    examId: publicExam.examId,
    track: publicExam.track,
    partI: {
      correct: partICorrect,
      total: publicExam.partI.length,
      score: partIScore,
      maxScore: Number((publicExam.partI.length * SCORING.partIPerQuestion).toFixed(2)),
      details: partIDetails,
    },
    partII: {
      details: partIISubDetails,
      score: Number(partIIScoreTotal.toFixed(2)),
      maxScore: publicExam.partII.length,
    },
    totalScore,
    maxScore: SCORING.maxScore,
    accuracy: gradedItems ? Math.round((correctItems / gradedItems) * 100) : 0,
    correctItems,
    gradedItems,
    totalQuestions,
  };
}

/** Kiểm tra shape của body nộp bài trước khi chấm */
export function isValidAnswerPayload(answers, publicExam) {
  if (!answers || typeof answers !== 'object') return false;
  if (!Array.isArray(answers.partI) || !Array.isArray(answers.partII)) return false;
  if (answers.partI.length > publicExam.partI.length) return false;
  if (answers.partII.length > publicExam.partII.length) return false;

  for (const value of answers.partI) {
    if (value === null || value === undefined) continue;
    if (!Number.isInteger(value) || value < 0 || value > 3) return false;
  }
  for (const row of answers.partII) {
    if (row === null || row === undefined) continue;
    if (!Array.isArray(row) || row.length > 4) return false;
    for (const value of row) {
      if (value === null || value === undefined) continue;
      if (typeof value !== 'boolean') return false;
    }
  }
  return true;
}
