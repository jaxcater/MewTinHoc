import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, ChevronRight, Expand, RotateCcw, Trophy, X, Zap } from 'lucide-react';
import { DURATIONS, EASINGS } from '../../variants';
import { RoadmapTracks, HomeShowcase } from './LandingInteractive';
import bankScreen from '../../assets/landing/screens/bank.webp';
import examScreen from '../../assets/landing/screens/exam.webp';
import battleScreen from '../../assets/landing/screens/battle.webp';
import './landing-experience.css';

const FEATURES = [
  { id: 'kho-de', label: 'Kho đề thi', title: 'Chọn đề.\nBắt nhịp ôn tập.', description: 'Tìm tài liệu, xem trước và tải về trong một chỗ.', image: bankScreen, tags: ['Xem trước', 'Tải tài liệu'] },
  { id: 'de-ai', label: 'Phòng thi thử thông minh', title: 'Thi thử thật.\nBiết chỗ cần ôn.', description: 'Đề theo ma trận, chấm điểm và AI cùng bạn nhìn lại bài làm.', image: examScreen, tags: ['50 phút', 'Chấm điểm & AI'] },
  { id: 'dau-truong', label: 'Battle · Đấu trường', title: 'Ba người.\nMột cuộc bứt tốc.', description: 'Rủ bạn bè hoặc ghép ngẫu nhiên. Chính xác trước, tốc độ sau.', image: battleScreen, tags: ['3 người / trận', '20 câu · 15 phút'] },
];

function TiltScreenshot({ feature, onOpen }) {
  const ref = useRef(null);
  const frame = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const reset = () => { cancelAnimationFrame(frame.current); frame.current = 0; if (ref.current) ref.current.style.transform = ''; };
  const tilt = event => {
    if (reduced || event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const element = ref.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const x = Math.max(-.5, Math.min(.5, (clientX - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (clientY - bounds.top) / bounds.height - .5));
      element.style.transform = `perspective(1100px) rotateX(${-y * 7}deg) rotateY(${x * 10}deg)`;
    });
  };
  return <button ref={ref} type="button" className="lx-screenshot" aria-label={`Xem lớn ${feature.label}`} onPointerMove={tilt} onPointerLeave={reset} onBlur={reset} onClick={() => onOpen(feature)}>
    <span className="lx-screenshot-bar"><span><i /><i /><i /></span><span>{feature.label}</span><Expand size={15} /></span>
    <img src={feature.image} alt={`Ảnh giao diện ${feature.label} của MewTinHoc`} width="1200" height="800" loading="lazy" decoding="async" draggable="false" />
    <span className="lx-screenshot-caption">Giao diện minh hoạ <span>Nhấn để xem lớn <Expand size={13} /></span></span>
  </button>;
}

function ScreenshotDialog({ feature, onClose }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="lx-dialog" aria-labelledby="lx-dialog-title" onClose={onClose} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="lx-dialog-heading"><h2 id="lx-dialog-title">{feature.label}</h2><button type="button" onClick={onClose} aria-label="Đóng ảnh giao diện"><X size={22} /></button></div>
    <img src={feature.image} alt={`Ảnh lớn giao diện ${feature.label}`} width="1200" height="800" />
  </dialog>;
}

function RankingPlayground() {
  const [first, setFirst] = useState(false);
  const reduced = useReducedMotion();
  const others = [{ id: 'a', name: 'Học viên A', xp: 480 }, { id: 'b', name: 'Học viên B', xp: 420 }];
  const self = { id: 'you', name: 'Bạn', xp: first ? 520 : 360 };
  const entries = first ? [self, ...others] : [...others, self];
  return <section className="lx-section lx-ranking" id="bang-xep-hang" aria-labelledby="lx-ranking-title">
    <div className="mtl-shell lx-ranking-grid">
      <div className="lx-feature-copy"><div className="li-aurora-heading"><span className="lx-label"><Trophy size={17} /> Bảng xếp hạng</span><h2 id="lx-ranking-title">Đến lượt bạn<br /><em>dẫn đầu.</em></h2></div><p>Tích lũy EXP. Nhìn nỗ lực đổi thành thứ hạng.</p>
        <button className="lx-button" type="button" onClick={() => setFirst(value => !value)}>{first ? 'Thử lại hành trình' : 'Bứt lên hạng nhất'}{first ? <RotateCcw size={18} /> : <Zap size={18} />}</button>
        <span className="lx-demo-note">Mô phỏng tương tác · Không cộng EXP</span>
      </div>
      <div className="lx-rank-board"><div className="lx-rank-heading"><span>Cuộc đua EXP</span><Trophy size={26} /></div>
        <ol>{entries.map((entry, index) => <motion.li key={entry.id} layout={reduced ? false : 'position'} initial={false} transition={{ duration: DURATIONS.countUp, ease: EASINGS.emilOut }} className={entry.id === 'you' ? `lx-climber${first ? ' is-first' : ''}` : ''}>
          <span className="lx-rank-position">{index === 0 ? <Trophy size={24} /> : `#${index + 1}`}</span><span className="lx-rank-avatar">{entry.id === 'you' ? 'M' : entry.id.toUpperCase()}</span><strong>{entry.name}</strong><span className="lx-rank-xp">{entry.xp}<small> EXP</small></span>
        </motion.li>)}</ol>
        <p role="status">{first ? 'Hạng 1. Một cú bứt phá của bạn!' : 'Bạn đang ở hạng 3. Thử bứt lên nào!'}<ChevronRight size={16} /></p>
      </div>
    </div>
  </section>;
}

export default function LandingExperience({ onStart }) {
  const [preview, setPreview] = useState(null);
  return <div className="mtl-experience" style={{ '--lx-feedback': `${DURATIONS.micro}s` }}>
    <RoadmapTracks />
    <HomeShowcase onStart={onStart} />
    {FEATURES.map((feature, index) => <section key={feature.id} id={feature.id} className={`lx-section lx-feature lx-feature--${index + 2}`} aria-labelledby={`lx-${feature.id}-title`}>
      <div className="mtl-shell lx-feature-grid"><div className="lx-feature-copy"><div className="li-aurora-heading"><span className="lx-label">{feature.label}</span><h2 id={`lx-${feature.id}-title`}>{feature.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h2></div><p>{feature.description}</p><div className="lx-feature-tags">{feature.tags.map(tag => <span key={tag}><Check size={14} />{tag}</span>)}</div><button type="button" className="lx-text-button" onClick={onStart}>Vào học cùng Mew <ArrowRight size={18} /></button></div><TiltScreenshot feature={feature} onOpen={setPreview} /></div>
    </section>)}
    <RankingPlayground />
    {preview && <ScreenshotDialog feature={preview} onClose={() => setPreview(null)} />}
  </div>;
}
