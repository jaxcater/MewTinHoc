import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Route,
  Sparkles,
  Target
} from 'lucide-react';
import { STREAK_EVOLUTIONS } from '../lib/streakEvolutions';
import { MewLiveRig } from './MewCatRig';
import { TestimonialWall } from './TestimonialWall';
import { MagneticArrowButton } from './MagneticArrowButton';
import mewMark from '../assets/gen-landing/mew-mark.webp';
import mewBrandLogo from '../../img/favicon.png';
import mewHeroIllustration from '../assets/gen-landing/mew-hero.webp';
import mewHeroMain from '../assets/gen-landing/mew-hero-main.png';
import mewTrackCs from '../assets/gen-landing/mew-track-cs.png';
import mewTrackIct from '../assets/gen-landing/mew-track-ict.png';
import mewAiTeacher from '../assets/gen-landing/mew-ai-teacher.png';
import mewStudyDesk from '../assets/gen-landing/mew-study-desk.png';
import mewStreakTrophy from '../assets/gen-landing/mew-streak-trophy.png';
import csSearch2d from '../assets/gen-landing/lessons/cs-search-2d.png';
import csPython2d from '../assets/gen-landing/lessons/cs-python-2d.png';
import csSql2d from '../assets/gen-landing/lessons/cs-sql-2d.png';
import csMl2d from '../assets/gen-landing/lessons/cs-ml-2d.png';
import ictExcel2d from '../assets/gen-landing/lessons/ict-excel-2d.png';
import ictPivot2d from '../assets/gen-landing/lessons/ict-pivot-2d.png';
import ictWeb2d from '../assets/gen-landing/lessons/ict-web-2d.png';
import ictMedia2d from '../assets/gen-landing/lessons/ict-media-2d.png';
import './landingPage.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DEPTH_LAYERS = [
  ['.mtl-glow', -10],
  ['.mtl-orbit', -16],
  ['.mtl-cat', 20],
  ['.mtl-cat__bubble', 34],
  ['.mtl-preview', 12],
  ['.mtl-chip', 44]
];

const TRACK_META = {
  cs: {
    id: 'cs',
    label: 'Lộ trình Khoa Học Máy Tính',
    shortLabel: 'KHMT'
  },
  ict: {
    id: 'ict',
    label: 'Lộ trình Tin Học Ứng Dụng',
    shortLabel: 'THƯD'
  }
};

const TRACK_LESSONS = {
  cs: [
    {
      step: '01',
      title: 'Thuật toán tìm kiếm Tuyến tính & Nhị phân',
      art: csSearch2d,
      alt: 'Minh họa 2D Thuật toán tìm kiếm Tuyến tính và Nhị phân'
    },
    {
      step: '02',
      title: 'Viết kịch bản Python nâng cao & Xử lý mảng',
      art: csPython2d,
      alt: 'Minh họa 2D Viết kịch bản Python nâng cao và Xử lý mảng'
    },
    {
      step: '03',
      title: 'Truy vấn SQL liên kết đa bảng & Gom nhóm',
      art: csSql2d,
      alt: 'Minh họa 2D Truy vấn SQL liên kết đa bảng và Gom nhóm'
    },
    {
      step: '04',
      title: 'Thuật toán Học máy & Phân cụm K-Means',
      art: csMl2d,
      alt: 'Minh họa 2D Thuật toán Học máy và Phân cụm K-Means'
    }
  ],
  ict: [
    {
      step: '01',
      title: 'Các hàm tìm kiếm VLOOKUP, HLOOKUP & Logic IF',
      art: ictExcel2d,
      alt: 'Minh họa 2D Các hàm tìm kiếm VLOOKUP, HLOOKUP và Logic IF'
    },
    {
      step: '02',
      title: 'Kỹ thuật Pivot Table & Báo cáo thống kê',
      art: ictPivot2d,
      alt: 'Minh họa 2D Kỹ thuật Pivot Table và Báo cáo thống kê'
    },
    {
      step: '03',
      title: 'Cây cấu trúc Website & Phần mềm tạo trang Web',
      art: ictWeb2d,
      alt: 'Minh họa 2D Cây cấu trúc Website và Phần mềm tạo trang Web'
    },
    {
      step: '04',
      title: 'Chỉnh sửa ảnh lớp (Layer) & Biên tập Video Web',
      art: ictMedia2d,
      alt: 'Minh họa 2D Chỉnh sửa ảnh lớp và Biên tập Video Web'
    }
  ]
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const SAMPLE_MCQS = [
  {
    id: 'mcq1',
    number: 'Câu 1',
    question: 'Thuật ngữ "Trí tuệ nhân tạo" (Artificial Intelligence) lần đầu tiên được sử dụng chính thức tại sự kiện nào?',
    options: [
      'Phép thử Turing năm 1950.',
      'Hội thảo Dartmouth năm 1956.',
      'Sự phát triển của hệ chuyên gia MYCIN năm 1972.',
      'Sự ra đời của Robot Asimo năm 1986.'
    ],
    correct: 1,
    explain: 'Hội thảo Dartmouth năm 1956 tại Đại học Dartmouth (Mỹ) đánh dấu sự ra đời chính thức của thuật ngữ và lĩnh vực Trí tuệ nhân tạo.'
  },
  {
    id: 'mcq2',
    number: 'Câu 2',
    question: 'Thiết bị mạng nào có chức năng chuyển tiếp dữ liệu giữa các máy tính trong cùng một mạng LAN dựa trên địa chỉ MAC?',
    options: ['Switch', 'Router', 'Modem', 'Access Point'],
    correct: 0,
    explain: 'Switch là thiết bị kết nối các máy tính trong mạng cục bộ LAN và chuyển tiếp dữ liệu dựa trên bảng địa chỉ MAC.'
  },
  {
    id: 'mcq3',
    number: 'Câu 3',
    question: 'Cơ sở dữ liệu (CSDL) là gì theo định nghĩa chuẩn trong Tin học?',
    options: [
      'Một tệp văn bản đơn giản dùng để lưu trữ nhật ký công việc cá nhân hàng ngày.',
      'Tập hợp các dữ liệu có liên quan với nhau và được lưu trữ có tổ chức trên hệ thống máy tính.',
      'Một phần mềm tiện ích hỗ trợ người dùng quét và tiêu diệt virus trên ổ cứng.',
      'Tập hợp tất cả các tệp hình ảnh và video được tải về từ mạng Internet.'
    ],
    correct: 1,
    explain: 'Theo tài liệu ôn thi và SGK Tin học, Cơ sở dữ liệu (CSDL) là tập hợp dữ liệu có liên quan với nhau, được lưu trữ một cách có tổ chức trên hệ thống máy tính để phục vụ nhu cầu khai thác thông tin của nhiều người dùng.'
  }
];

const SAMPLE_TF = {
  id: 'tf1',
  number: 'Câu 4 (Phần II · Đúng/Sai)',
  context: 'Một phòng khám y tế xây dựng CSDL gồm các bảng: BENHNHAN(maBN, hoTen, ngaySinh, sdt), BACSI(maBS, hoTen, chuyenKhoa), LICHKHAM(maLK, maBN, maBS, ngayKham, chanDoan). Các bạn học sinh thảo luận về CSDL này:',
  statements: [
    {
      id: 'a',
      text: 'Trường maLK làm khóa chính của bảng LICHKHAM để xác định duy nhất từng lượt khám bệnh.',
      isTrue: true,
      explain: 'maLK là mã lượt khám duy nhất cho mỗi cuộc hẹn giữa bệnh nhân và bác sĩ.'
    },
    {
      id: 'b',
      text: 'Bảng LICHKHAM chứa hai khóa ngoài maBN và maBS để liên kết lần lượt tới hai bảng BENHNHAN và BACSI.',
      isTrue: true,
      explain: 'Hai khóa ngoài giúp liên kết cuộc hẹn với thông tin bệnh nhân và bác sĩ phụ trách.'
    },
    {
      id: 'c',
      text: "Để tìm danh sách các bệnh nhân được khám bởi bác sĩ 'Nguyễn Văn B' trong ngày hôm nay, truy vấn cần nối cả 3 bảng.",
      isTrue: true,
      explain: 'Cần lấy tên bác sĩ từ BACSI, ngày khám từ LICHKHAM và tên bệnh nhân từ BENHNHAN.'
    },
    {
      id: 'd',
      text: 'Một bác sĩ chỉ được phép khám cho duy nhất 1 bệnh nhân trong suốt quá trình hoạt động của phòng khám.',
      isTrue: false,
      explain: 'Mối quan hệ giữa bác sĩ và bệnh nhân qua bảng LICHKHAM là mối quan hệ n - n (một bác sĩ khám nhiều bệnh nhân và một bệnh nhân có thể khám nhiều lần).'
    }
  ]
};

const BASE_LEADERBOARD = [
  { id: 'u1', name: 'Minh Khôi', meta: '12A1 · KHMT', streak: 28, exp: 1760, isYou: false },
  { id: 'u2', name: 'Gia Hân', meta: 'Chuyên Tin · KHMT', streak: 21, exp: 1540, isYou: false },
  { id: 'you', name: 'Bạn (Học viên mới)', meta: 'Mục tiêu 9.5+ THPTQG', streak: 7, isYou: true },
  { id: 'u4', name: 'Tuấn Kiệt', meta: '12A4 · THƯD', streak: 14, exp: 1290, isYou: false }
];

const FAQ_ITEMS = [
  {
    q: 'Tôi nên chọn nhánh Khoa học máy tính hay Tin học ứng dụng?',
    a: 'Hãy chọn đúng định hướng mà trường THPT của bạn đăng ký dự thi tốt nghiệp. Cả hai nhánh đều học chung 6 chủ đề nền tảng, sau đó tách riêng Phần II sang Python và SQL (KHMT) hoặc Excel, HTML và CSS (THƯD).'
  },
  {
    q: 'Thang điểm câu Đúng/Sai Phần II của Bộ GD&ĐT tính như thế nào?',
    a: 'Mỗi câu Phần II gồm 4 ý a, b, c, d với tổng tối đa 1.0 điểm: đúng 1 ý nhận 0.1 điểm, đúng 2 ý nhận 0.25 điểm, đúng 3 ý nhận 0.5 điểm và đúng cả 4 ý mới đạt trọn 1.0 điểm.'
  },
  {
    q: 'MewTinHoc có miễn phí cho học sinh lớp 12 không?',
    a: 'Bạn có thể đăng nhập bằng Google hoặc nhấn Vào học thử nhanh để trải nghiệm trọn vẹn lộ trình ôn tập theo phân ban, kho đề PDF, phòng luyện AI và bảng xếp hạng EXP.'
  },
  {
    q: 'Tiến độ học tập và điểm thi thử được lưu ở đâu?',
    a: 'Mọi bài học đã hoàn thành, chuỗi ngày Streak, điểm EXP và lịch sử làm đề đều được đồng bộ theo tài khoản Google của bạn trên Supabase Realtime.'
  }
];

function SplitHeadline({ lines, deltas = [0, 110, 220] }) {
  return (
    <h1 className="mtl-h1">
      {lines.map((line, index) => (
        <span className="mtl-mask-line" key={line.key}>
          <span style={{ '--delay': `${deltas[index] ?? index * 110}ms` }}>
            {line.gradient ? <em className="mtl-grad">{line.text}</em> : line.text}
          </span>
        </span>
      ))}
    </h1>
  );
}

function SectionIntro({ lines, subcopy, align = 'center' }) {
  return (
    <div className={`prep-intro-block ${align === 'left' ? 'prep-intro-block--left' : 'prep-section-head'}`}>
      <h2 className="prep-h2">
        {lines.map((line) => (
          <span key={line.text} className="prep-h2-mask">
            <span className={`prep-h2-line${line.accent ? ' prep-h2-accent' : ''}`}>
              {line.text}
            </span>
          </span>
        ))}
      </h2>
      <span className="prep-intro-rule" aria-hidden="true" />
      {subcopy && <p className="prep-subcopy prep-intro-sub">{subcopy}</p>}
    </div>
  );
}

function useHeroPointerParallax() {
  const layerRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const targets = DEPTH_LAYERS.flatMap(([selector, depth]) =>
      [...layer.querySelectorAll(selector)].map((node) => ({
        node,
        depth,
        original: node.style.transform
      }))
    );

    let inView = true;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let running = !document.hidden;

    const write = () => {
      for (const { node, depth } of targets) {
        const transform = `translate3d(${(currentX * depth).toFixed(3)}px, ${(currentY * depth).toFixed(3)}px, 0)`;
        if (node.style.transform !== transform) node.style.transform = transform;
      }
    };

    const tick = () => {
      if (!running || !inView || !fineQuery.matches || reduceQuery.matches) {
        frame = 0;
        return;
      }
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      write();
      if (running && (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001)) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const queue = () => {
      if (!frame && running && inView && fineQuery.matches && !reduceQuery.matches) {
        frame = requestAnimationFrame(tick);
      }
    };

    const onPointerMove = (event) => {
      if (!inView || document.hidden || reduceQuery.matches || !fineQuery.matches) return;
      const { innerWidth, innerHeight } = window;
      targetX = (event.clientX / innerWidth) * 2 - 1;
      targetY = (event.clientY / innerHeight) * 2 - 1;
      queue();
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      queue();
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (!running && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (running) queue();
    };

    const onPreference = () => {
      if (reduceQuery.matches || !fineQuery.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        targetX = targetY = currentX = currentY = 0;
        write();
      } else {
        queue();
      }
    };

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (!inView && frame) {
              cancelAnimationFrame(frame);
              frame = 0;
            }
            if (inView) queue();
          });
    observer?.observe(layer);

    write();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    reduceQuery.addEventListener('change', onPreference);
    fineQuery.addEventListener('change', onPreference);

    return () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      reduceQuery.removeEventListener('change', onPreference);
      fineQuery.removeEventListener('change', onPreference);
      observer?.disconnect();
      targets.forEach(({ node, original }) => {
        node.style.transform = original;
      });
    };
  }, []);

  return layerRef;
}

const STREAM_COLORS = ['#FFFBEB', '#FDE68A', '#FBBF24', '#FB923C', '#F59E0B'];

/**
 * MewEnergyStream
 * Smooth 60fps canvas particle stream visualizing Mew's study effort flowing
 * from the desk lamp into the Leaderboard card without harsh lightning bolts.
 */
function MewEnergyStream({ active, boostPhase }) {
  const canvasRef = useRef(null);
  const boostRef = useRef(boostPhase);

  useEffect(() => {
    boostRef.current = boostPhase;
  }, [boostPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceQuery.matches) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let inView = true;
    let rafId = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(100, Math.round(rect.width));
      height = Math.max(100, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    const makeMote = (stagger = false) => {
      const lane = Math.random();
      const speed = 0.0048 + Math.random() * 0.0052;
      return {
        t: stagger ? Math.random() : 0,
        speed,
        lane,
        jitterX: (Math.random() - 0.5) * 0.06,
        jitterY: (Math.random() - 0.5) * 0.14,
        arcLift: (Math.random() - 0.5) * 0.18,
        radius: 1.8 + Math.random() * 2.8,
        color: STREAM_COLORS[Math.floor(Math.random() * STREAM_COLORS.length)],
        trail: []
      };
    };

    const motes = Array.from({ length: 58 }, () => makeMote(true));
    const sparks = [];

    const spawnSparks = (x, y, color) => {
      for (let i = 0; i < 2; i++) {
        const angle = (Math.random() - 0.5) * Math.PI * 1.4;
        const mag = 0.8 + Math.random() * 1.8;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag,
          life: 1,
          r: 1.5 + Math.random() * 2,
          color
        });
      }
    };

    const evalBezier = (p0, c1, c2, p1, t) => {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;
      return {
        x: uuu * p0.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + ttt * p1.x,
        y: uuu * p0.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + ttt * p1.y
      };
    };

    const renderFrame = () => {
      if (!inView || document.hidden) {
        rafId = 0;
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const isDesktop = width >= 860;
      const isActive = active;
      const speedMult = boostRef.current ? 1.55 : isActive ? 1.0 : 0.45;
      const maxOpacity = isActive ? 0.92 : 0.35;

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.t += m.speed * speedMult;
        if (m.t >= 1) {
          const endPt = m.trail[m.trail.length - 1];
          if (endPt && isActive && sparks.length < 40) {
            spawnSparks(endPt.x, endPt.y, m.color);
          }
          motes[i] = makeMote(false);
          continue;
        }

        const p0 = isDesktop
          ? { x: width * (0.25 + m.jitterX), y: height * (0.37 + m.lane * 0.14 + m.jitterY * 0.5) }
          : { x: width * (0.38 + m.lane * 0.24), y: height * (0.28 + m.jitterY * 0.25) };

        const c1 = isDesktop
          ? { x: width * 0.38, y: height * (0.25 + m.lane * 0.16 + m.arcLift) }
          : { x: width * (0.34 + m.lane * 0.32 + m.arcLift), y: height * 0.40 };

        const c2 = isDesktop
          ? { x: width * 0.48, y: height * (0.22 + m.lane * 0.18 - m.arcLift * 0.5) }
          : { x: width * (0.36 + m.lane * 0.28 - m.arcLift * 0.5), y: height * 0.48 };

        const p1 = isDesktop
          ? { x: width * (0.56 + m.jitterX * 0.8), y: height * (0.22 + m.lane * 0.26) }
          : { x: width * (0.32 + m.lane * 0.36), y: height * (0.56 + m.jitterY * 0.2) };

        const pt = evalBezier(p0, c1, c2, p1, m.t);
        m.trail.push(pt);
        if (m.trail.length > 7) m.trail.shift();

        const edgeFade = Math.sin(m.t * Math.PI);
        const alpha = Math.max(0, Math.min(1, edgeFade * 1.25)) * maxOpacity;

        if (m.trail.length > 1) {
          for (let j = 1; j < m.trail.length; j++) {
            const frac = j / m.trail.length;
            ctx.beginPath();
            ctx.moveTo(m.trail[j - 1].x, m.trail[j - 1].y);
            ctx.lineTo(m.trail[j].x, m.trail[j].y);
            ctx.strokeStyle = m.color;
            ctx.globalAlpha = alpha * frac * 0.45;
            ctx.lineWidth = Math.max(0.8, m.radius * frac * 0.9);
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Soft luminous outer aura
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, m.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Crisp glowing core
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let s = sparks.length - 1; s >= 0; s--) {
        const sp = sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.045;
        if (sp.life <= 0) {
          sparks.splice(s, 1);
          continue;
        }
        ctx.globalAlpha = sp.life * 0.75;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * sp.life, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      rafId = requestAnimationFrame(renderFrame);
    };

    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView && !rafId) rafId = requestAnimationFrame(renderFrame);
            else if (!inView && rafId) {
              cancelAnimationFrame(rafId);
              rafId = 0;
            }
          });
    io?.observe(canvas);
    rafId = requestAnimationFrame(renderFrame);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [active]);

  return <canvas ref={canvasRef} className="prep-lb-particles-canvas" aria-hidden="true" />;
}

export default function LandingPage({ user, onStart, onOpenLogin, onLogin, onEnterApp }) {
  const rootRef = useRef(null);
  const parallaxRef = useHeroPointerParallax();
  const lessonSeqRef = useRef(null);
  const lessonHeaderRef = useRef(null);
  const lbStageRef = useRef(null);
  const lbBoardRef = useRef(null);
  const prevRankRef = useRef(3);
  const [heroReady, setHeroReady] = useState(false);

  // Track lesson explorer state (null = collapsed until user clicks Khám phá)
  const [exploredTrack, setExploredTrack] = useState(null);

  // Real sample mini-exam state (collapsed by default behind #002 MagneticArrowButton)
  const [showSampleExam, setShowSampleExam] = useState(false);
  const sampleExamRef = useRef(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [tfAnswers, setTfAnswers] = useState({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [teacherReaction, setTeacherReaction] = useState(0);

  // Leaderboard auto energy stream & score climb state
  const [lbDisplayExp, setLbDisplayExp] = useState(1420);
  const [lbChargeProgress, setLbChargeProgress] = useState(0);
  const [lbEnergized, setLbEnergized] = useState(false);
  const [rankReaction, setRankReaction] = useState(0);

  // Streak milestone + FAQ state (null until user clicks a day button)
  const [selectedEvoIndex, setSelectedEvoIndex] = useState(null);
  const [streakReaction, setStreakReaction] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  useLayoutEffect(() => {
    document.documentElement.classList.add('landing-route', 'js');
    document.body.classList.add('is-landing');
    return () => {
      document.documentElement.classList.remove('landing-route');
      document.body.classList.remove('is-landing');
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // General GSAP Scroll Reveals + smooth automatic particle energy surge to #1
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray('.prep-intro-block').forEach((block) => {
          const lines = block.querySelectorAll('.prep-h2-line');
          const rule = block.querySelector('.prep-intro-rule');
          const sub = block.querySelector('.prep-intro-sub');
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: block,
              start: 'top 85%',
              once: true
            }
          });
          if (lines.length) {
            tl.fromTo(
              lines,
              { yPercent: 112, opacity: 0 },
              {
                yPercent: 0,
                opacity: 1,
                duration: 0.68,
                stagger: 0.11,
                ease: 'power4.out',
                clearProps: 'transform,opacity'
              }
            );
          }
          if (rule) {
            tl.fromTo(
              rule,
              { scaleX: 0.15, opacity: 0 },
              {
                scaleX: 1,
                opacity: 1,
                duration: 0.45,
                ease: 'power3.out',
                clearProps: 'transform,opacity'
              },
              '-=0.38'
            );
          }
          if (sub) {
            tl.fromTo(
              sub,
              { y: 16, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.52,
                ease: 'power3.out',
                clearProps: 'transform,opacity'
              },
              '-=0.3'
            );
          }
        });

        gsap.utils.toArray('.prep-reveal-section').forEach((sec) => {
          const targets = sec.querySelectorAll('.prep-reveal-card');
          if (!targets.length) return;
          gsap.from(targets, {
            y: 26,
            opacity: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: sec,
              start: 'top 82%',
              once: true
            }
          });
        });

        if (lbStageRef.current) {
          ScrollTrigger.create({
            trigger: lbStageRef.current,
            start: 'top 76%',
            once: true,
            onEnter: () => {
              setLbEnergized(true);
              setRankReaction((k) => k + 1);
              const tracker = { exp: 1420, pct: 0 };
              gsap.to(tracker, {
                exp: 1840,
                pct: 100,
                duration: 2.35,
                delay: 0.2,
                ease: 'power2.inOut',
                onUpdate: () => {
                  setLbDisplayExp(Math.round(tracker.exp));
                  setLbChargeProgress(Math.round(tracker.pct));
                }
              });
            }
          });
        }
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        setLbEnergized(true);
        setLbDisplayExp(1840);
        setLbChargeProgress(100);
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  // GSAP ScrollTrigger Choreography for dynamic 4 track lessons + 5th "KHÁM PHÁ THÊM"
  useGSAP(
    () => {
      if (!exploredTrack || !lessonSeqRef.current) return undefined;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const rail = lessonSeqRef.current;
        const spine = rail.querySelector('.prep-lesson-spine-fill');
        if (spine) {
          gsap.fromTo(
            spine,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: rail,
                start: 'top 78%',
                end: 'bottom 74%',
                scrub: 0.35
              }
            }
          );
        }

        const cards = gsap.utils.toArray('[data-lesson-card]', rail);
        cards.forEach((card) => {
          gsap.from(card, {
            y: 40,
            scale: 0.96,
            opacity: 0,
            duration: 0.58,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
              once: true
            }
          });

          const artImg = card.querySelector('.prep-lesson-art img');
          if (artImg) {
            gsap.from(artImg, {
              x: 20,
              rotate: -4,
              opacity: 0,
              duration: 0.62,
              delay: 0.06,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
              scrollTrigger: {
                trigger: card,
                start: 'top 90%',
                once: true
              }
            });
          }
        });
      });

      const timer = setTimeout(() => ScrollTrigger.refresh(), 70);
      return () => {
        clearTimeout(timer);
        mm.revert();
      };
    },
    { scope: lessonSeqRef, dependencies: [exploredTrack], revertOnUpdate: true }
  );

  // Leaderboard computed rows & dynamic rank detection
  const leaderboardRows = BASE_LEADERBOARD.map((entry) => ({
    ...entry,
    exp: entry.isYou ? lbDisplayExp : entry.exp
  }))
    .sort((a, b) => b.exp - a.exp)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  const yourRank = leaderboardRows.find((r) => r.isYou)?.rank ?? 3;

  // Spring lift + Mew celebratory reaction whenever rank climbs (3 -> 2 -> 1)
  useGSAP(
    () => {
      if (yourRank >= prevRankRef.current) {
        prevRankRef.current = yourRank;
        return undefined;
      }
      prevRankRef.current = yourRank;
      setRankReaction((k) => k + 1);

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const youRow = lbBoardRef.current?.querySelector('.prep-lb-row.is-you');
        if (youRow) {
          gsap.fromTo(
            youRow,
            { y: 24, scale: 0.96 },
            { y: 0, scale: 1, duration: 0.48, ease: 'back.out(1.45)', clearProps: 'transform' }
          );
        }
      });
      return () => mm.revert();
    },
    { scope: lbBoardRef, dependencies: [yourRank] }
  );

  const handleDemoLogin = () => {
    if (onLogin) {
      onLogin({
        id: 'demo-student-id',
        isDemo: true,
        name: 'Nguyễn Văn An',
        email: 'an.nguyen@hocvien.edu.vn',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        grade: 'Lớp 12 — Ôn thi THPTQG'
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
      (onStart || onOpenLogin)?.();
    }
  };

  const handlePrimaryAction = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (user && onEnterApp) onEnterApp();
    else (onStart || onOpenLogin)?.();
  };

  const handleExploreTrack = (trackId) => {
    localStorage.setItem('tinhoc_selected_track', trackId);
    setExploredTrack(trackId);
    setTimeout(() => {
      lessonHeaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      ScrollTrigger.refresh();
    }, 90);
  };

  const handleToggleSampleExam = () => {
    setTeacherReaction((k) => k + 1);
    setShowSampleExam((prev) => {
      const next = !prev;
      setTimeout(() => {
        if (next) sampleExamRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        ScrollTrigger.refresh();
      }, 110);
      return next;
    });
  };

  // Sample Exam scoring & counts
  const answeredMcqCount = SAMPLE_MCQS.filter((q) => mcqAnswers[q.id] !== undefined).length;
  const tfAnsweredCount = SAMPLE_TF.statements.filter((s) => tfAnswers[s.id] !== undefined).length;
  const totalQuestionProgress = answeredMcqCount + (tfAnsweredCount > 0 ? 1 : 0);

  const mcqCorrectCount = SAMPLE_MCQS.filter((q) => mcqAnswers[q.id] === q.correct).length;
  const tfCorrectCount = SAMPLE_TF.statements.filter((s) => tfAnswers[s.id] === s.isTrue).length;
  const tfPoints =
    tfCorrectCount === 0
      ? 0
      : tfCorrectCount === 1
        ? 0.1
        : tfCorrectCount === 2
          ? 0.25
          : tfCorrectCount === 3
            ? 0.5
            : 1.0;
  const totalExamPoints = (mcqCorrectCount * 0.25 + tfPoints).toFixed(2);

  // Streak selected milestone (null initially)
  const curEvo = selectedEvoIndex !== null ? STREAK_EVOLUTIONS[selectedEvoIndex] : null;
  const activeLessons = exploredTrack ? TRACK_LESSONS[exploredTrack] : [];
  const boostPhase = lbEnergized && lbChargeProgress < 100;

  return (
    <div ref={rootRef} className="prep-root" id="top">
      <div className="mtl-mesh" aria-hidden="true">
        <div className="mtl-mesh__layer mtl-mesh__layer--a" />
      </div>

      {/* RESTORED ORIGINAL HEADER */}
      <header className="mtl-nav">
        <div className="mtl-shell">
          <div className="mtl-nav__inner">
            <a href="#top" className="mtl-brand" aria-label="MewTinHoc Trang chủ">
              <span className="mtl-brand__logo">
                <img
                  className="mtl-brand__mark"
                  src={mewBrandLogo}
                  width="512"
                  height="512"
                  alt=""
                  decoding="async"
                  draggable="false"
                />
              </span>
              <div className="mtl-brand__text">
                <div className="mtl-brand__name">
                  <span className="mtl-brand__accent">Mew</span>TinHoc
                </div>
                <div className="mtl-brand__tag">
                  <span className="mtl-brand__dot" aria-hidden="true" />
                  Luyện thi Tin học THPT
                </div>
              </div>
            </a>

            <nav className="mtl-nav__links" aria-label="Điều hướng trang giới thiệu">
              <a className="mtl-nav__link" href="#lo-trinh">Lộ trình</a>
              <a className="mtl-nav__link" href="#lo-trinh">Kho đề</a>
              <a className="mtl-nav__link" href="#phong-ai">Đề AI</a>
              <a className="mtl-nav__link" href="#bang-xep-hang">Đấu trường</a>
              <button type="button" className="mtl-btn mtl-nav__cta" onClick={handlePrimaryAction}>
                {user ? 'Vào bàn học' : 'Đăng nhập'}
              </button>
            </nav>
          </div>
        </div>

        <nav className="mtl-mobile-nav" aria-label="Khám phá MewTinHoc">
          <a href="#lo-trinh"><Route size={14} aria-hidden="true" />Lộ trình</a>
          <a href="#lo-trinh"><BookOpen size={14} aria-hidden="true" />Khám phá</a>
          <a href="#phong-ai"><Sparkles size={14} aria-hidden="true" />Thi thử &amp; AI</a>
        </nav>
      </header>

      <main>
        {/* SECTION 1: EXACT ORIGINAL HERO SECTION */}
        <section className="mtl-top-hero" data-motion="">
          <div className="mtl-shell">
            <div className="mtl-hero">
              <div className="mtl-hero__grid" ref={parallaxRef} data-ready={heroReady ? '' : undefined}>
                <div className="mtl-hero__copy">
                  <span className="mtl-hero__eyebrow">
                    <span aria-hidden="true" />
                    Có Mew đồng hành, có hướng để đi
                  </span>
                  <SplitHeadline
                    lines={[
                      { key: 'line-1', text: 'Ôn Tin học' },
                      { key: 'line-2', text: 'vững từng bước.', gradient: true }
                    ]}
                  />
                  <p className="mtl-lead">
                    Từ hiểu bài đến tự tin vào phòng thi. Lộ trình rõ ràng, kho đề theo chủ đề
                    và AI giúp bạn nhận ra phần cần ôn tiếp.
                  </p>
                  <div className="mtl-hero__actions">
                    <button type="button" className="mtl-btn" onClick={handlePrimaryAction}>
                      {user ? 'Mở bàn học ngay' : 'Bắt đầu học ngay'}
                      <span className="mtl-btn__arrow" aria-hidden="true">
                        <ArrowRight size={18} strokeWidth={2.25} />
                      </span>
                    </button>
                  </div>
                  <p className="mtl-hero__reassurance">
                    <Check size={14} aria-hidden="true" />
                    Đăng nhập với Google · Lưu lại tiến độ học
                  </p>
                </div>

                <div className="mtl-hero__stage">
                  <span className="mtl-stage-caption">GÓC HỌC TẬP CỦA BẠN</span>
                  <div className="mtl-glow" aria-hidden="true" />
                  <div className="mtl-orbit" aria-hidden="true">
                    <span className="mtl-orbit__dot mtl-orbit__dot--1" />
                    <span className="mtl-orbit__dot mtl-orbit__dot--2" />
                    <span className="mtl-orbit__dot mtl-orbit__dot--3" />
                  </div>
                  <div className="mtl-cat">
                    <img
                      src={mewHeroIllustration}
                      width="640"
                      height="677"
                      alt="Mew, linh vật mèo đeo kính đội mũ tốt nghiệp của MewTinHoc"
                      fetchPriority="high"
                      decoding="async"
                      draggable="false"
                    />
                    <span className="mtl-cat__bubble">
                      <Sparkles size={14} aria-hidden="true" />
                      Học cùng Mew nhé!
                    </span>
                  </div>
                  <div className="mtl-preview">
                    <div className="mtl-preview__head">
                      <span className="mtl-preview__title">Ví dụ tiến độ</span>
                      <span className="mtl-preview__pct">Tuần 7/12</span>
                    </div>
                    <div className="mtl-preview__bar">
                      <span className="mtl-preview__fill" />
                    </div>
                    <div className="mtl-preview__meta">
                      <span>Giai đoạn 2 · Chuyên sâu</span>
                    </div>
                  </div>
                  <div className="mtl-chip">
                    <span className="mtl-chip__dot" aria-hidden="true" />
                    Mỗi ngày, tiến một bước
                  </div>
                </div>

                <div className="mtl-hero__facts">
                  <div className="mtl-fact">
                    <span className="mtl-fact__value">12 tuần</span>
                    <span className="mtl-fact__label">lộ trình rõ ràng</span>
                  </div>
                  <div className="mtl-fact">
                    <span className="mtl-fact__value">24 + 4 câu</span>
                    <span className="mtl-fact__label">thi thử 50 phút</span>
                  </div>
                  <div className="mtl-fact">
                    <span className="mtl-fact__value">2 định hướng</span>
                    <span className="mtl-fact__label">KHMT &amp; THUD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: TWO COLOR-SYNCED TRACKS — KHMT (ORANGE) & THƯD (OCEAN BLUE) */}
        <section id="lo-trinh" className="prep-section prep-section--sunlit prep-reveal-section">
          <div className="prep-container">
            <SectionIntro
              lines={[
                { text: 'Chọn đúng lộ trình' },
                { text: 'theo kỳ thi của bạn', accent: true }
              ]}
              subcopy="Mỗi định hướng mang bản sắc màu riêng và mở ra 4 bài học chuyên sâu khác nhau — cuộn chuột để khám phá từng bài cùng Mew."
            />

            <div className="prep-tracks-grid">
              <article
                className={`prep-track-card prep-track-card--cs prep-reveal-card ${
                  exploredTrack === 'cs' ? 'is-selected' : ''
                }`}
              >
                <div className="prep-track-body">
                  <span className="prep-track-tag prep-track-tag--cs">KHMT (Computer Science)</span>
                  <h3 className="prep-h3">Khoa Học Máy Tính</h3>
                  <p className="prep-subcopy">
                    Làm chủ thuật toán tìm kiếm, lập trình Python xử lý mảng, truy vấn SQL đa bảng và Học máy K-Means.
                  </p>
                  <div className="prep-track-chips">
                    <span className="prep-track-chip">Tìm kiếm Tuyến tính &amp; Nhị phân</span>
                    <span className="prep-track-chip">Python nâng cao</span>
                    <span className="prep-track-chip">SQL &amp; Học máy</span>
                  </div>
                  <button
                    type="button"
                    className="prep-pill-btn prep-pill-btn--primary"
                    onClick={() => handleExploreTrack('cs')}
                  >
                    Khám phá lộ trình KHMT
                  </button>
                </div>

                <div className="prep-track-rig">
                  <MewLiveRig
                    src={mewTrackCs}
                    alt="Mew lập trình Python và thuật toán với laptop"
                    waveIntensity={0.45}
                  />
                </div>
              </article>

              <article
                className={`prep-track-card prep-track-card--ict prep-reveal-card ${
                  exploredTrack === 'ict' ? 'is-selected' : ''
                }`}
              >
                <div className="prep-track-body">
                  <span className="prep-track-tag prep-track-tag--ict">THƯD (ICT)</span>
                  <h3 className="prep-h3">Tin Học Ứng Dụng</h3>
                  <p className="prep-subcopy">
                    Làm chủ hàm Excel VLOOKUP/IF, Pivot Table thống kê, thiết kế cây Website và biên tập đồ họa, video số.
                  </p>
                  <div className="prep-track-chips">
                    <span className="prep-track-chip">Excel VLOOKUP &amp; IF</span>
                    <span className="prep-track-chip">Pivot Table</span>
                    <span className="prep-track-chip">Web &amp; Video số</span>
                  </div>
                  <button
                    type="button"
                    className="prep-pill-btn prep-pill-btn--blue"
                    onClick={() => handleExploreTrack('ict')}
                  >
                    Khám phá lộ trình THƯD
                  </button>
                </div>

                <div className="prep-track-rig">
                  <MewLiveRig
                    src={mewTrackIct}
                    alt="Mew Tin học ứng dụng cầm thẻ bảng tính Excel và bố cục web"
                    waveIntensity={0.6}
                  />
                </div>
              </article>
            </div>

            {exploredTrack && (
              <div className={`prep-lesson-explorer prep-lesson-explorer--${exploredTrack}`}>
                <div className="prep-lesson-bar" ref={lessonHeaderRef}>
                  <div className="prep-lesson-bar-info">
                    <span className={`prep-track-tag prep-track-tag--${exploredTrack}`}>
                      {TRACK_META[exploredTrack].label}
                    </span>
                    <span className="prep-lesson-scroll-hint">
                      Cuộn xuống để lần lượt mở khóa từng bài học tiêu biểu
                    </span>
                  </div>
                  <div className="prep-lesson-switcher" role="group" aria-label="Chuyển lộ trình bài học">
                    <button
                      type="button"
                      className={`prep-room-tab prep-room-tab--cs ${exploredTrack === 'cs' ? 'is-active' : ''}`}
                      onClick={() => setExploredTrack('cs')}
                    >
                      KHMT
                    </button>
                    <button
                      type="button"
                      className={`prep-room-tab prep-room-tab--ict ${exploredTrack === 'ict' ? 'is-active' : ''}`}
                      onClick={() => setExploredTrack('ict')}
                    >
                      THƯD
                    </button>
                  </div>
                </div>

                <div ref={lessonSeqRef} className="prep-lesson-rail">
                  <div className="prep-lesson-spine" aria-hidden="true">
                    <div className="prep-lesson-spine-fill" />
                  </div>

                  {activeLessons.map((lesson) => (
                    <article
                      key={`${exploredTrack}-${lesson.step}`}
                      className="prep-lesson-card"
                      data-lesson-card=""
                    >
                      <div className="prep-lesson-copy">
                        <span className="prep-lesson-step">Bài {lesson.step}</span>
                        <h4 className="prep-lesson-title">{lesson.title}</h4>
                      </div>
                      <div className="prep-lesson-art">
                        <img
                          src={lesson.art}
                          width="600"
                          height="600"
                          alt={lesson.alt}
                          loading="lazy"
                          decoding="async"
                          draggable="false"
                        />
                      </div>
                    </article>
                  ))}

                  <button
                    type="button"
                    className="prep-lesson-card prep-lesson-card--more"
                    data-lesson-card=""
                    onClick={handlePrimaryAction}
                  >
                    <div className="prep-lesson-copy">
                      <span className="prep-lesson-step">Toàn bộ lộ trình</span>
                      <span className="prep-lesson-more-label">KHÁM PHÁ THÊM</span>
                    </div>
                    <span className="prep-lesson-more-arrow" aria-hidden="true">
                      <ArrowRight size={22} strokeWidth={2.4} />
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: COMPACT AI FEATURE LANDING + EXPANDABLE SAMPLE EXAM */}
        <section id="phong-ai" className="prep-section prep-section--apricot prep-reveal-section">
          <div className="prep-container">
            <SectionIntro
              lines={[
                { text: 'Tạo đề chuẩn ma trận,' },
                { text: 'chấm chữa cùng Mew AI', accent: true }
              ]}
              subcopy="Trải nghiệm hệ thống sinh đề thích nghi theo đúng cấu trúc Bộ GD&ĐT và chấm chữa phân hóa từng ý cùng gia sư Mew AI."
            />

            <div className="prep-ai-intro-shell prep-reveal-card">
              <div className="prep-ai-intro-grid">
                <div className="prep-ai-intro-copy">
                  <div className="prep-teacher-name">Gia sư Mew AI · Sinh đề &amp; Chấm bài thông minh</div>
                  <p className="prep-teacher-reply">
                    Hệ thống AI của MewTinHoc giúp bạn luyện thi chủ động như đang có gia sư chấm chữa 1-1:
                  </p>
                  <ul className="prep-ai-feature-list">
                    <li>
                      <Sparkles size={16} aria-hidden="true" />
                      <span>
                        <strong>Tạo đề AI theo ma trận chuẩn:</strong> Tự chọn chủ đề, phân ban KHMT/THƯD và mức độ để AI lắp ghép đề mới 24 + 4 câu không trùng lặp.
                      </span>
                    </li>
                    <li>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <span>
                        <strong>Chấm điểm tự động chuẩn Bộ GD&amp;ĐT:</strong> Tính 0.25đ/câu Phần I và thang lũy tiến 0.1 / 0.25 / 0.5 / 1.0 điểm cho từng câu Đúng/Sai.
                      </span>
                    </li>
                    <li>
                      <Target size={16} aria-hidden="true" />
                      <span>
                        <strong>Giải thích cặn kẽ từng lỗi sai:</strong> Chỉ rõ bẫy kiến thức ngay sau khi nộp bài. Bấm nút bên dưới để làm thử ngay 4 câu trích từ kho đề thật.
                      </span>
                    </li>
                  </ul>

                  <div className="prep-ai-intro-actions">
                    <MagneticArrowButton
                      label={showSampleExam ? 'Thu gọn bài làm thử' : 'Làm thử đề AI ngay'}
                      goLabel={showSampleExam ? 'Đã mở bài thử!' : 'Đã thu gọn!'}
                      ariaExpanded={showSampleExam}
                      ariaControls="sample-ai-exam-panel"
                      onClick={handleToggleSampleExam}
                    />
                  </div>
                </div>

                <div className="prep-ai-intro-visual">
                  <div className="prep-teacher-rig-box">
                    <MewLiveRig
                      src={mewAiTeacher}
                      alt="Gia sư Mew AI đeo tai nghe cầm que chỉ giảng bài"
                      waveIntensity={0.7}
                      reactionKey={teacherReaction}
                      onPoke={() => setTeacherReaction((k) => k + 1)}
                    />
                  </div>
                  <span className="prep-ai-intro-chip">
                    Đề mẫu thực tế · 3 câu Phần I + 1 câu Đúng/Sai
                  </span>
                </div>
              </div>
            </div>

            {showSampleExam && (
              <div
                id="sample-ai-exam-panel"
                ref={sampleExamRef}
                className="prep-ai-shell prep-ai-exam-reveal"
              >
                <div className="prep-ai-grid">
                  <div className="prep-exam-sheet">
                    <div className="prep-exam-sheet-head">
                      <div>
                        <span className="prep-phase-weeks">Đề mẫu trực tiếp từ kho đề MewTinHoc</span>
                        <h3 className="prep-h3" style={{ marginTop: '0.45rem' }}>
                          3 câu Phần I + 1 câu Đúng/Sai Phần II
                        </h3>
                      </div>
                      <span className="prep-exam-progress-pill">
                        Đã chọn {totalQuestionProgress}/4 câu
                      </span>
                    </div>

                    <div className="prep-exam-questions">
                      {SAMPLE_MCQS.map((q) => {
                        const picked = mcqAnswers[q.id];
                        return (
                          <div key={q.id} className="prep-exam-q-card">
                            <div className="prep-exam-q-title">
                              <span className="prep-exam-q-num">{q.number}</span>
                              <span>{q.question}</span>
                            </div>
                            <div className="prep-exam-opts">
                              {q.options.map((opt, idx) => {
                                const isPicked = picked === idx;
                                const isRight = idx === q.correct;
                                let stateClass = '';
                                if (examSubmitted) {
                                  if (isRight) stateClass = 'is-correct';
                                  else if (isPicked) stateClass = 'is-wrong';
                                } else if (isPicked) {
                                  stateClass = 'is-selected';
                                }
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    disabled={examSubmitted}
                                    className={`prep-exam-opt ${stateClass}`}
                                    onClick={() => {
                                      setMcqAnswers((prev) => ({ ...prev, [q.id]: idx }));
                                      setTeacherReaction((k) => k + 1);
                                    }}
                                  >
                                    <span className="prep-exam-opt-key">{OPTION_LETTERS[idx]}</span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      <div className="prep-exam-q-card">
                        <div className="prep-exam-q-title">
                          <span className="prep-exam-q-num">{SAMPLE_TF.number}</span>
                          <span>{SAMPLE_TF.context}</span>
                        </div>
                        <div className="prep-tf-rows">
                          {SAMPLE_TF.statements.map((item) => {
                            const picked = tfAnswers[item.id];
                            const getChoiceClass = (btnValue) => {
                              if (picked !== btnValue) return '';
                              if (!examSubmitted) return 'is-selected';
                              return btnValue === item.isTrue ? 'is-ok' : 'is-bad';
                            };
                            return (
                              <div key={item.id} className="prep-tf-card">
                                <span className="prep-tf-text">
                                  <strong>{item.id})</strong> {item.text}
                                </span>
                                <div className="prep-tf-btns">
                                  <button
                                    type="button"
                                    disabled={examSubmitted}
                                    className={`prep-tf-choice ${getChoiceClass(true)}`}
                                    onClick={() => {
                                      setTfAnswers((prev) => ({ ...prev, [item.id]: true }));
                                      setTeacherReaction((k) => k + 1);
                                    }}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    type="button"
                                    disabled={examSubmitted}
                                    className={`prep-tf-choice ${getChoiceClass(false)}`}
                                    onClick={() => {
                                      setTfAnswers((prev) => ({ ...prev, [item.id]: false }));
                                      setTeacherReaction((k) => k + 1);
                                    }}
                                  >
                                    Sai
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="prep-exam-actions">
                      <button
                        type="button"
                        className="prep-pill-btn prep-pill-btn--ghost"
                        onClick={handleToggleSampleExam}
                      >
                        Thu gọn bài thử
                      </button>
                      {!examSubmitted ? (
                        <button
                          type="button"
                          className="prep-pill-btn prep-pill-btn--primary"
                          onClick={() => {
                            setExamSubmitted(true);
                            setTeacherReaction((k) => k + 1);
                          }}
                        >
                          <Sparkles size={17} aria-hidden="true" />
                          Nộp bài &amp; Chấm điểm AI
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="prep-pill-btn prep-pill-btn--ghost"
                            onClick={() => {
                              setMcqAnswers({});
                              setTfAnswers({});
                              setExamSubmitted(false);
                              setTeacherReaction((k) => k + 1);
                            }}
                          >
                            Làm lại đề mẫu
                          </button>
                          <button
                            type="button"
                            className="prep-pill-btn prep-pill-btn--primary"
                            onClick={handlePrimaryAction}
                          >
                            Tạo đề AI đầy đủ 50 phút
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="prep-teacher-panel">
                    {!examSubmitted ? (
                      <div className="prep-ai-explain-card">
                        <div className="prep-teacher-name">Hướng dẫn làm bài thử cùng Mew AI</div>
                        <p className="prep-teacher-reply">
                          Chọn đáp án cho 3 câu trắc nghiệm và 4 ý Đúng/Sai bên trái, sau đó nhấn{' '}
                          <strong>Nộp bài &amp; Chấm điểm AI</strong> để xem điểm quy đổi và lời giải chi tiết từng câu ngay tại khung này.
                        </p>
                      </div>
                    ) : (
                      <div className="prep-ai-explain-card">
                        <div className="prep-score-summary">
                          <div>
                            <span className="prep-teacher-name">Kết quả chấm bài từ Mew AI</span>
                            <div className="prep-score-value">{totalExamPoints} / 1.75 điểm</div>
                          </div>
                          <span className="prep-score-breakdown">
                            Phần I: {mcqCorrectCount}/3 · Phần II: {tfCorrectCount}/4 ý
                          </span>
                        </div>

                        <div className="prep-explain-list">
                          {SAMPLE_MCQS.map((q) => {
                            const picked = mcqAnswers[q.id];
                            const isOk = picked === q.correct;
                            return (
                              <div key={q.id} className={`prep-explain-item ${isOk ? 'is-ok' : 'is-bad'}`}>
                                <div className="prep-explain-head">
                                  <strong>{q.number}</strong>
                                  <span className={`prep-explain-badge ${isOk ? 'is-ok' : 'is-bad'}`}>
                                    {picked === undefined
                                      ? 'Chưa chọn'
                                      : isOk
                                        ? 'Chính xác (+0.25đ)'
                                        : `Sai · Đáp án ${OPTION_LETTERS[q.correct]}`}
                                  </span>
                                </div>
                                <p>{q.explain}</p>
                              </div>
                            );
                          })}

                          <div className={`prep-explain-item ${tfCorrectCount === 4 ? 'is-ok' : 'is-neutral'}`}>
                            <div className="prep-explain-head">
                              <strong>Câu 4 · Đúng/Sai Phần II</strong>
                              <span className="prep-explain-badge is-neutral">
                                Đúng {tfCorrectCount}/4 ý (+{tfPoints}đ)
                              </span>
                            </div>
                            <div className="prep-explain-tf-list">
                              {SAMPLE_TF.statements.map((st) => {
                                const picked = tfAnswers[st.id];
                                const stOk = picked === st.isTrue;
                                return (
                                  <div key={st.id} className="prep-explain-tf-row">
                                    <span className={`prep-tf-dot ${stOk ? 'is-ok' : 'is-bad'}`}>
                                      {st.id}) {st.isTrue ? 'Đúng' : 'Sai'}
                                    </span>
                                    <span>{st.explain}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3B: STUDENT TESTIMONIALS WALL (#207 — FULL WIDTH) */}
        <section id="danh-gia" className="prep-section prep-section--reviews prep-reveal-section">
          <div className="prep-container">
            <div className="prep-reviews-shell">
              <div className="prep-reviews-copy">
                <SectionIntro
                  align="left"
                  lines={[
                    { text: 'Học viên nói gì' },
                    { text: 'khi ôn thi cùng Mew?', accent: true }
                  ]}
                  subcopy="Những lời chia sẻ thật từ các bạn học sinh lớp 12 theo cả hai nhánh KHMT & THƯD sau khi luyện đề và giữ chuỗi Streak mỗi ngày trên MewTinHoc."
                />
                <div className="prep-reviews-stats prep-reveal-card">
                  <div className="prep-reviews-stat">
                    <strong>5.0 / 5.0</strong>
                    <span>Đánh giá trung bình</span>
                  </div>
                  <div className="prep-reviews-stat">
                    <strong>2 nhánh</strong>
                    <span>KHMT &amp; THƯD</span>
                  </div>
                </div>
                <p className="prep-reviews-hint prep-reveal-card">
                  Di chuột vào một cột bất kỳ để dừng lại và đọc kỹ đánh giá
                </p>
              </div>

              <div className="prep-reviews-stage prep-reveal-card">
                <div className="prep-reviews-glow" aria-hidden="true" />
                <TestimonialWall lightShell />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: AUTO ENERGY-PARTICLE STREAM LEADERBOARD */}
        <section id="bang-xep-hang" className="prep-section prep-section--honey prep-reveal-section">
          <div className="prep-container">
            <SectionIntro
              lines={[
                { text: 'Chăm chỉ học mỗi ngày,' },
                { text: 'bứt tốc trên bảng xếp hạng', accent: true }
              ]}
              subcopy="Mỗi phút Mew miệt mài trên bàn học đều chuyển hóa thành những hạt năng lượng sáng nạp thẳng vào bảng xếp hạng, đưa bạn tiến thẳng lên vị trí dẫn đầu."
            />

            <div className="prep-lb-shell prep-reveal-card">
              <div className="prep-lb-stage" ref={lbStageRef}>
                {/* 60FPS FLOWING ENERGY PARTICLES (MEW STUDY DESK -> LEADERBOARD) */}
                <MewEnergyStream active={lbEnergized} boostPhase={boostPhase} />

                {/* LEFT: FOCUSED STUDYING MEW AT DESK */}
                <div className="prep-lb-study-col">
                  <div className="prep-lb-rig-wrap">
                    <div
                      className={`prep-lb-charge-aura ${boostPhase ? 'is-surging' : ''}`}
                      aria-hidden="true"
                    />
                    <div className="prep-lb-rig-box">
                      <MewLiveRig
                        src={mewStudyDesk}
                        alt="Mew 3D ngồi chăm chú học bài trên bàn học"
                        waveIntensity={0.65}
                        reactionKey={rankReaction}
                        onPoke={() => setRankReaction((k) => k + 1)}
                      />
                    </div>
                  </div>

                  <p className="prep-lb-study-caption">
                    {yourRank === 1
                      ? 'Nguồn năng lượng chăm chỉ đã đưa bạn lên vị trí #1!'
                      : 'Đang truyền từng hạt năng lượng chăm chỉ vào bảng xếp hạng...'}
                  </p>
                </div>

                {/* RIGHT: AUTO-CHARGING LEADERBOARD CARD */}
                <div className={`prep-lb-board ${lbEnergized ? 'is-charged' : ''}`} ref={lbBoardRef}>
                  <div className="prep-lb-board-head">
                    <div>
                      <div className="prep-lb-board-title">Top học viên tuần này</div>
                      <div className="prep-lb-board-sub">
                        {yourRank === 1
                          ? 'Vươn lên dẫn đầu bảng xếp hạng #1!'
                          : `Vị trí hiện tại của bạn: Hạng #${yourRank}`}
                      </div>
                    </div>
                    <span className="prep-lb-live-badge">
                      <span className="prep-lb-live-dot" aria-hidden="true" />
                      Đang thi đua
                    </span>
                  </div>

                  <div className="prep-lb-rows">
                    {leaderboardRows.map((row) => (
                      <div
                        key={row.id}
                        className={`prep-lb-row ${row.isYou ? 'is-you' : ''}`}
                      >
                        <span className={`prep-lb-rank rank-${row.rank}`}>
                          {row.rank === 1 ? <Award size={15} aria-hidden="true" /> : `#${row.rank}`}
                        </span>
                        <div className="prep-lb-user">
                          <span className="prep-lb-name">{row.name}</span>
                          <span className="prep-lb-meta">{row.meta} · {row.streak} ngày Streak</span>
                        </div>
                        <span className="prep-lb-exp">{row.exp.toLocaleString('en-US')} EXP</span>
                        {row.isYou && (
                          <div className="prep-lb-energy-track" aria-hidden="true">
                            <div
                              className="prep-lb-energy-fill"
                              style={{ width: `${lbChargeProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="prep-lb-actions">
                    <button
                      type="button"
                      className="prep-pill-btn prep-pill-btn--primary"
                      onClick={handlePrimaryAction}
                    >
                      Vào đua top cùng Mew
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: STREAK ECOSYSTEM (DAY-ONLY BUTTONS + OFFICIAL NAMES) & FAQ */}
        <section id="streak" className="prep-section prep-section--sunlit prep-reveal-section">
          <div className="prep-container">
            <SectionIntro
              lines={[
                { text: 'Duy trì kỷ luật 90 ngày' },
                { text: 'vững vàng tới phòng thi', accent: true }
              ]}
              subcopy="Điểm danh mỗi ngày để tiến hóa qua 6 cột mốc linh vật và giải đáp mọi thắc mắc trước khi bắt đầu."
            />

            <div className="prep-eco-grid">
              <div className="prep-streak-card prep-reveal-card">
                <div className="prep-streak-stage">
                  <div className="prep-streak-rig">
                    <MewLiveRig
                      src={mewStreakTrophy}
                      alt="Mew cùng cúp tiến hóa ngọn lửa Streak"
                      waveIntensity={0.85}
                      reactionKey={streakReaction}
                      onPoke={() => setStreakReaction((k) => k + 1)}
                    />
                  </div>
                  {curEvo ? (
                    <div key={curEvo.id} className="prep-streak-info">
                      <span
                        className="prep-phase-weeks"
                        style={{ color: curEvo.titleColor }}
                      >
                        {curEvo.tierLabel} · {curEvo.dateLabel}
                      </span>
                      <h3 className="prep-h3" style={{ marginTop: '0.45rem' }}>
                        {curEvo.name}
                      </h3>
                      <p className="prep-subcopy" style={{ marginTop: '0.35rem' }}>
                        {curEvo.description} Ân hạn nghỉ tối đa 2 ngày liên tiếp mà không mất chuỗi.
                      </p>
                    </div>
                  ) : (
                    <div className="prep-streak-info">
                      <span className="prep-phase-weeks">6 cột mốc tiến hóa · Tới 90 ngày</span>
                      <h3 className="prep-h3" style={{ marginTop: '0.45rem' }}>
                        Nhấn vào số ngày để xem mốc Streak
                      </h3>
                      <p className="prep-subcopy" style={{ marginTop: '0.35rem' }}>
                        Chọn bất kỳ mốc ngày nào bên dưới để mở khóa tên gọi và ý nghĩa cấp tiến hóa. Ân hạn nghỉ tối đa 2 ngày liên tiếp mà không mất chuỗi.
                      </p>
                    </div>
                  )}
                </div>

                <div className="prep-milestone-grid" role="tablist" aria-label="6 mốc số ngày Streak">
                  {STREAK_EVOLUTIONS.map((evo, idx) => (
                    <button
                      key={evo.id}
                      type="button"
                      role="tab"
                      aria-selected={selectedEvoIndex === idx}
                      className={`prep-milestone-btn prep-milestone-btn--day-only ${
                        selectedEvoIndex === idx ? 'is-active' : ''
                      }`}
                      onClick={() => {
                        setSelectedEvoIndex(idx);
                        setStreakReaction((k) => k + 1);
                      }}
                    >
                      <span className="prep-milestone-day">{evo.dayLabel || `${evo.minDays} ngày`}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div id="hoi-dap" className="prep-faq-list prep-reveal-card">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={item.q} className={`prep-faq-item ${isOpen ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className="prep-faq-trigger"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                      >
                        <span>{item.q}</span>
                        <span className="prep-faq-icon" aria-hidden="true">+</span>
                      </button>
                      <div className="prep-faq-collapse">
                        <div className="prep-faq-inner">
                          <p className="prep-faq-answer">{item.a}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: RICH CARAMEL-ORANGE CTA BANNER */}
        <section className="prep-section prep-section--cta-wrap prep-reveal-section" style={{ paddingTop: 0 }}>
          <div className="prep-container">
            <div className="prep-cta-banner prep-reveal-card">
              <div className="prep-cta-copy">
                <h2 className="prep-cta-h2">Sẵn sàng đồng hành cùng Mew vào phòng thi?</h2>
                <p className="prep-cta-sub">
                  Đăng nhập một chạm bằng tài khoản Google hoặc trải nghiệm ngay với tài khoản học viên mẫu để mở lộ trình theo phân ban và kho đề thi chuẩn Bộ GD&amp;ĐT.
                </p>
                <div className="prep-hero-cta-row">
                  <button
                    type="button"
                    className="prep-pill-btn prep-pill-btn--white prep-hero-cta-lg"
                    onClick={handlePrimaryAction}
                  >
                    {user ? 'Mở bàn học ngay' : 'Đăng nhập với Google'}
                  </button>
                  <button
                    type="button"
                    className="prep-pill-btn prep-pill-btn--outline-white prep-hero-cta-lg"
                    onClick={user ? onEnterApp : handleDemoLogin}
                  >
                    Vào học thử miễn phí
                  </button>
                </div>
              </div>

              <div className="prep-cta-rig">
                <MewLiveRig
                  src={mewHeroMain}
                  alt="Mew vẫy tay mời bạn bắt đầu ôn thi"
                  waveIntensity={1.0}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* RESTORED ORIGINAL .site-footer */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <div className="site-footer-logo">
              <img src={mewMark} alt="MewTinHoc" className="site-footer-logo-img" />
            </div>
            <div className="site-footer-brand-text">
              <div className="site-footer-brand-name">
                <span className="site-footer-brand-accent">Mew</span>
                <span className="site-footer-brand-name-text">TinHoc</span>
                <span className="site-footer-brand-tag">THPTQG</span>
              </div>
              <div className="site-footer-brand-slogan">
                Đồng hành cùng bạn vượt qua kì thi
              </div>
            </div>
          </div>

          <p className="site-footer-desc">
            Nền tảng luyện thi Tin học tốt nghiệp THPT chuẩn cấu trúc mới của Bộ Giáo dục &amp; Đào tạo. Lộ trình trực quan, kho đề thi chuyên sâu và đánh giá phân hóa bằng trí tuệ nhân tạo (AI).
          </p>

          <div className="site-footer-highlight">
            <span className="site-footer-highlight-item">Lộ trình theo phân ban KHMT &amp; THƯD</span>
            <span className="site-footer-highlight-dot" />
            <span className="site-footer-highlight-item">Kho đề thi chuyên sâu</span>
            <span className="site-footer-highlight-dot" />
            <span className="site-footer-highlight-item">Chấm điểm &amp; đánh giá bằng AI</span>
          </div>

          <div className="site-footer-bottom">
            <span className="site-footer-copyright">
              © 2026 <strong>MewTinHoc</strong>. Bảo lưu mọi quyền.
            </span>
            <span className="site-footer-account">
              {user ? (
                <>Tài khoản Google đang kết nối: <strong>{user.name}</strong></>
              ) : (
                <>Đồng hành ôn thi Tin học cùng <strong>Mew</strong></>
              )}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
