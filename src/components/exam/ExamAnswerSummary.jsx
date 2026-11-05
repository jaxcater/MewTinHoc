import React from 'react';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function ExamAnswerSummary({ exam, mcqAnswers, tfAnswers, onNavigate }) {
  const questions = [
    ...exam.partI.map((question, index) => {
      const chosen = mcqAnswers[index];
      const answered = Number.isInteger(chosen) && chosen >= 0 && chosen < question.options.length;
      return { part: 'partI', index, no: question.no, text: question.stem,
        answered: answered ? 1 : 0, total: 1,
        answers: [{ label: answered ? LETTERS[chosen] : 'Chưa chọn', answered }] };
    }),
    ...exam.partII.map((question, index) => {
      const answers = question.statements.map((statement, statementIndex) => {
        const chosen = tfAnswers[index]?.[statementIndex];
        return { label: `${statement.key}: ${typeof chosen === 'boolean' ? (chosen ? 'Đúng' : 'Sai') : 'Chưa chọn'}`,
          answered: typeof chosen === 'boolean' };
      });
      return { part: 'partII', index, no: exam.partI.length + index + 1, text: question.scenario,
        answered: answers.filter((answer) => answer.answered).length, total: answers.length, answers };
    }),
  ];
  const completed = questions.filter((question) => question.answered === question.total).length;
  const partial = questions.filter((question) => question.answered > 0 && question.answered < question.total).length;

  return (
    <section className="exam-answer-summary" aria-labelledby="exam-summary-title">
      <header className="exam-answer-summary__head">
        <h2 id="exam-summary-title">Tóm tắt bài làm</h2>
        <p>Bấm vào một câu để xem lại đáp án bạn đã chọn.</p>
        <div className="exam-answer-summary__stats">
          <span>Đã làm đủ: <strong>{completed}/{questions.length} câu</strong></span>
          <span>Còn thiếu ý: <strong>{partial} câu</strong></span>
          <span>Chưa làm: <strong>{questions.length - completed - partial} câu</strong></span>
        </div>
      </header>
      {['partI', 'partII'].map((part) => (
        <section key={part} aria-labelledby={`exam-summary-${part}`}>
          <h3 id={`exam-summary-${part}`}>{part === 'partI' ? 'Phần I · Trắc nghiệm' : 'Phần II · Đúng/Sai'}</h3>
          <div className="exam-answer-summary__list">
            {questions.filter((question) => question.part === part).map((question) => {
              const state = question.answered === question.total ? 'done' : question.answered > 0 ? 'partial' : 'empty';
              return (
                <button type="button" className="exam-answer-summary__question" key={question.index}
                  data-state={state} onClick={() => onNavigate(part, question.index)}
                  aria-label={`Xem câu ${question.no}, ${part === 'partI' ? 'Phần I' : 'Phần II'}, ${state === 'done' ? 'đã làm đủ' : state === 'partial' ? 'còn thiếu ý' : 'chưa làm'}`}>
                  <span className="exam-answer-summary__number">Câu {question.no}</span>
                  <span className="exam-answer-summary__text">{question.text}</span>
                  <span className="exam-answer-summary__answers">
                    {question.answers.map((answer, index) => (
                      <span key={index} data-answered={answer.answered}>{answer.label}</span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
