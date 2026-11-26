// Lucian UX/UI Prompt #207 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#207
import { useEffect, useRef, useState } from 'react';
import './testimonialWall.css';

const DEFAULT_REVIEWS = [
  {
    id: 'minh-anh',
    name: 'Minh Anh',
    role: '12A1 · KHMT',
    initials: 'MA',
    avatarBg: '#EA580C',
    parts: ['Trước sợ câu SQL Đúng/Sai lắm mà ', 'học theo lộ trình Mew mượt hẳn luôn <3', ''],
  },
  {
    id: 'gia-bao',
    name: 'Gia Bảo',
    role: '12A3 · THƯD',
    initials: 'GB',
    avatarBg: '#F97316',
    parts: ['Đề AI chấm xong ', 'chỉ đúng chỗ hay dính bẫy, cày 2 tuần lên hẳn 9+ =))', ''],
  },
  {
    id: 'khanh-linh',
    name: 'Khánh Linh',
    role: '12A2 · KHMT',
    initials: 'KL',
    avatarBg: '#D97706',
    parts: ['Học mà ', 'sợ đứt streak của Mew nên tối nào cũng tự giác vào làm đề', ' hihi'],
  },
  {
    id: 'duc-huy',
    name: 'Đức Huy',
    role: '12C1 · THƯD',
    initials: 'ĐH',
    avatarBg: '#C2410C',
    parts: ['Hàm VLOOKUP với Pivot Table ', 'giải thích dễ hiểu xỉu, làm phát ăn luôn =>>', ''],
  },
  {
    id: 'thao-vy',
    name: 'Thảo Vy',
    role: '12A5 · KHMT',
    initials: 'TV',
    avatarBg: '#E06D1B',
    parts: ['', 'Giao diện xinh với đua top vui thật sự,', ' mấy đứa cùng bàn rủ nhau cày kkk'],
  },
  {
    id: 'tuan-kiet',
    name: 'Tuấn Kiệt',
    role: '12A4 · KHMT',
    initials: 'TK',
    avatarBg: '#0284C7',
    parts: [
      'Mê nhất quả ',
      'AI giải thích từng ý Đúng/Sai rõ từng dòng code Python,',
      ' đọc xong thông não liền :))',
    ],
  },
  {
    id: 'ngoc-han',
    name: 'Ngọc Hân',
    role: '12B2 · THƯD',
    initials: 'NH',
    avatarBg: '#0EA5E9',
    parts: [
      'Bữa trước thi thử trên trường trúng y chang dạng ',
      'bảng tính với truy vấn CSDL từng ôn trên web,',
      ' đỉnh thực sự!',
    ],
  },
  {
    id: 'quoc-dat',
    name: 'Quốc Đạt',
    role: '12A6 · KHMT',
    initials: 'QĐ',
    avatarBg: '#10B981',
    parts: [
      'Đấu trường đối kháng ',
      'làm 15 phút mà tim đập như thi thật,',
      ' áp lực nhưng cuốn dã man =))',
    ],
  },
  {
    id: 'phuong-nhi',
    name: 'Phương Nhi',
    role: '12D1 · THƯD',
    initials: 'PN',
    avatarBg: '#EC4899',
    parts: [
      'Mới đầu phân vân chọn nhánh nào, vào đây ',
      'xem lộ trình chia rõ KHMT với THƯD',
      ' cái hết mông lung hẳn luôn.',
    ],
  },
  {
    id: 'hoang-nam',
    name: 'Hoàng Nam',
    role: '12A7 · KHMT',
    initials: 'HN',
    avatarBg: '#F59E0B',
    parts: [
      'Giá mà web thêm ',
      'chế độ hẹn giờ nhắc giữ streak buổi tối nữa',
      ' là 100 điểm không có nhưng luôn á Mew ơi ^^',
    ],
  },
  {
    id: 'bao-tram',
    name: 'Bảo Trâm',
    role: '12C3 · THƯD',
    initials: 'BT',
    avatarBg: '#8B5CF6',
    parts: [
      'Phần HTML/CSS có ví dụ trực quan, ',
      'ôn 1 buổi nhớ sạch thẻ với thuộc tính cơ bản,',
      ' đỡ phải học vẹt ghê.',
    ],
  },
  {
    id: 'nhat-minh',
    name: 'Nhật Minh',
    role: '12A8 · KHMT',
    initials: 'NM',
    avatarBg: '#14B8A6',
    parts: [
      'Kho đề bám sát ma trận mới của Bộ, ',
      'mỗi lần sinh đề lại ra câu mới không bị thuộc đáp án',
      ' quá đã!',
    ],
  },
  {
    id: 'my-duyen',
    name: 'Mỹ Duyên',
    role: '12B1 · THƯD',
    initials: 'MD',
    avatarBg: '#EF4444',
    parts: [
      'Con mèo cam nhìn cưng xỉu, ',
      'mỗi lần làm đúng câu khó thấy nó vui là có động lực cày tiếp',
      ' liền kkk',
    ],
  },
  {
    id: 'trung-hieu',
    name: 'Trung Hiếu',
    role: '12A9 · KHMT',
    initials: 'TH',
    avatarBg: '#6366F1',
    parts: [
      'Góp ý nhẹ là ',
      'thêm vài bộ đề vận dụng cao về thuật toán tìm kiếm',
      ' nha ad, tụi em đang ghiền cày điểm 10!',
    ],
  },
  {
    id: 'yen-nhi',
    name: 'Yến Nhi',
    role: '12C2 · THƯD',
    initials: 'YN',
    avatarBg: '#E11D48',
    parts: [
      'Từ đứa hay mất điểm vặt phần lý thuyết mạng máy tính, ',
      'cày hết chặng ôn tập xong tự tin hẳn lúc vào phòng thi <3',
      '',
    ],
  },
];

function ReviewCard({ review, isDuplicate }) {
  const [before, highlight, after] = review.parts;
  return (
    <figure
      className="u207-cd"
      aria-hidden={isDuplicate ? 'true' : undefined}
      tabIndex={isDuplicate ? undefined : 0}
    >
      <i aria-hidden="true">★★★★★</i>
      <p>
        {before}
        {highlight ? <mark>{highlight}</mark> : null}
        {after}
      </p>
      <figcaption className="u207-pp">
        <span
          className="u207-av"
          style={{ background: review.avatarBg }}
          aria-hidden="true"
        >
          {review.initials}
        </span>
        <span>
          <b>{review.name}</b>
          <small>{review.role}</small>
        </span>
      </figcaption>
    </figure>
  );
}

export function TestimonialWall({
  reviews = DEFAULT_REVIEWS,
  lightShell = false,
  framed = false,
  showHeader = false,
  ariaLabel = 'Đánh giá của học viên MewTinHoc',
}) {
  const rootRef = useRef(null);
  const colRefs = useRef([null, null]);
  const hlRefs = useRef([null, null]);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const latest = entries[entries.length - 1];
        if (latest) root.classList.toggle('is-off', !latest.isIntersecting);
      },
      { threshold: 0.01 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const cleanups = colRefs.current.map((co, colIdx) => {
      if (!co) return () => {};
      const tr = co.querySelector('.u207-tr');
      if (!tr) return () => {};

      const mark = (card) => {
        const prev = hlRefs.current[colIdx];
        if (prev === card) return;
        if (prev) prev.classList.remove('is-hl');
        hlRefs.current[colIdx] = card;
        if (card) card.classList.add('is-hl');
      };

      const onPointerMove = (e) => {
        const y = e.clientY;
        const hit = Array.from(tr.children).find((c) => {
          const r = c.getBoundingClientRect();
          return y >= r.top && y <= r.bottom;
        });
        mark(hit || null);
      };

      const onPointerLeave = () => mark(null);

      const onFocusIn = (e) => {
        co.classList.add('is-hold');
        const focusedCard = e.target?.closest?.('.u207-cd');
        if (focusedCard && co.contains(focusedCard)) mark(focusedCard);
      };

      const onFocusOut = (e) => {
        if (e.relatedTarget && co.contains(e.relatedTarget)) return;
        co.classList.remove('is-hold');
        mark(null);
      };

      co.addEventListener('pointermove', onPointerMove);
      co.addEventListener('pointerleave', onPointerLeave);
      co.addEventListener('focusin', onFocusIn);
      co.addEventListener('focusout', onFocusOut);

      return () => {
        co.removeEventListener('pointermove', onPointerMove);
        co.removeEventListener('pointerleave', onPointerLeave);
        co.removeEventListener('focusin', onFocusIn);
        co.removeEventListener('focusout', onFocusOut);
        mark(null);
        co.classList.remove('is-hold');
      };
    });

    return () => cleanups.forEach((fn) => fn());
  }, [reducedMotion, reviews]);

  const leftCol = reviews.filter((_, idx) => idx % 2 === 0);
  const rightCol = reviews.filter((_, idx) => idx % 2 === 1);
  const columns = [
    { items: leftCol, duration: '44s', dir: 'normal', key: 'left' },
    { items: rightCol, duration: '50s', dir: 'reverse', key: 'right' },
  ];

  const rootClassName = `ux u207${lightShell ? ' u207--light-shell' : ''}${framed ? ' u207--framed' : ''}`;

  return (
    <div ref={rootRef} className={rootClassName} role="region" aria-label={ariaLabel}>
      {showHeader ? (
        <div className="u207-hd">
          <h3>Học viên nói gì khi ôn thi cùng Mew?</h3>
          <p>
            <i aria-hidden="true">★★★★★</i>
            <b>5.0</b>
            {reviews.length} đánh giá nổi bật
          </p>
        </div>
      ) : null}

      <div className="u207-wl">
        {columns.map((col, colIdx) => (
          <div
            key={col.key}
            className="u207-co"
            ref={(el) => {
              colRefs.current[colIdx] = el;
            }}
          >
            <div
              className="u207-tr"
              style={{ '--t': col.duration, '--dir': col.dir }}
            >
              {(reducedMotion ? [0] : [0, 1]).map((rep) =>
                col.items.map((review) => (
                  <ReviewCard
                    key={`${review.id}-${rep}`}
                    review={review}
                    isDuplicate={rep === 1 && !reducedMotion}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestimonialWall;
