import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 30;

export default function QuestionNavigator({ exam, mcqAnswers, tfAnswers, activePart, onChangePart }) {
  const [current, setCurrent] = useState(activePart + '-0');
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState(null);
  const questions = [
    ...exam.partI.map((q, index) => ({ key: 'partI-' + index, part: 'partI',
      label: q.no, answered: Number.isInteger(mcqAnswers[index]) })),
    ...exam.partII.map((q, index) => ({ key: 'partII-' + index, part: 'partII',
      label: exam.partI.length + index + 1,
      answered: q.statements.every((_, i) => typeof tfAnswers[index]?.[i] === 'boolean') })),
  ];
  const pageCount = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));

  useEffect(() => {
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById('exam-question-' + target);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element?.focus({ preventScroll: true });
      setCurrent(target);
      const [part, index] = target.split('-');
      setPage(Math.floor(((part === 'partII' ? exam.partI.length : 0) + Number(index)) / PAGE_SIZE));
      setTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, activePart, exam.partI.length]);

  useEffect(() => {
    setCurrent(activePart + '-0');
    setPage(Math.floor((activePart === 'partII' ? exam.partI.length : 0) / PAGE_SIZE));
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setCurrent(visible[0].target.dataset.questionKey);
    }, { rootMargin: '-100px 0px -55% 0px', threshold: 0 });
    document.querySelectorAll('[data-question-key]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [activePart, exam.partI.length]);

  const navigate = (question) => {
    onChangePart(question.part);
    setCurrent(question.key);
    setTarget(question.key);
  };

  return (
    <aside className="exam-question-nav" aria-label="Danh sách câu hỏi">
      <div className="exam-question-nav__head">
        <h2>Danh sách câu hỏi</h2>
        <span>TRANG {page + 1}/{pageCount}</span>
      </div>
      <div className="exam-question-nav__legend">
        <span><i data-state="done" />Đã làm</span>
        <span><i />Chưa làm</span>
        <span><i data-state="current" />Hiện tại</span>
      </div>
      <div className="exam-question-nav__grid">
        {questions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((question) => (
          <button key={question.key} type="button" data-answered={question.answered}
            aria-current={current === question.key ? 'step' : undefined}
            aria-label={'Câu ' + question.label + ', ' + (question.part === 'partI' ? 'Phần I' : 'Phần II') + ', ' + (question.answered ? 'đã làm' : 'chưa làm')}
            onClick={() => navigate(question)}>{question.label}</button>
        ))}
      </div>
      {exam.partII.length > 0 && <p className="exam-question-nav__note">Câu Đúng/Sai: trả lời đủ các ý để đánh dấu đã làm.</p>}
      {pageCount > 1 && (
        <nav className="exam-question-nav__pages" aria-label="Trang danh sách câu hỏi">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Trang trước">‹</button>
          {Array.from({ length: pageCount }, (_, index) => (
            <button key={index} type="button" aria-current={page === index ? 'page' : undefined}
              onClick={() => setPage(index)}>{index + 1}</button>
          ))}
          <button type="button" disabled={page === pageCount - 1} onClick={() => setPage(page + 1)} aria-label="Trang sau">›</button>
        </nav>
      )}
    </aside>
  );
}
