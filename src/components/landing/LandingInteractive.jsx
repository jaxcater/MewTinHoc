import { useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpen, Check, ChevronDown, Code2, Cpu, Database, Flame, Flag, Globe2, Laptop, Layers, RotateCcw, ShieldCheck, Target, Trophy } from 'lucide-react';
import CountUpNumber from '../motion/CountUpNumber';
import { DURATIONS, EASINGS } from '../../variants';
import './landing-interactive.css';

const TRACKS = [
  { id: 'ict', label: 'Tin học ứng dụng', code: 'ICT', note: 'Cơ sở dữ liệu · Thiết kế web', icon: Laptop },
  { id: 'cs', label: 'Khoa học máy tính', code: 'CS', note: 'Python · Thuật toán · AI', icon: Cpu },
];

function SampleStations({ track }) {
  const [selected, setSelected] = useState(0);
  const [completed, setCompleted] = useState([]);
  const reduced = useReducedMotion();
  const done = completed.includes(selected);
  return <div className={`li-station-preview li-theme-${track.id}`}>
    <div className="li-preview-heading"><span><Flag size={17} /> {track.label}</span><small>5 chặng mẫu · Không lưu tiến độ</small></div>
    <div className="li-station-fan" aria-label={`Năm chặng mẫu của ${track.label}`}>
      {Array.from({ length: 5 }, (_, index) => <motion.button key={index} type="button"
        initial={reduced ? false : { opacity: 0, transform: `translateX(${(2 - index) * 65}%) translateY(28px) rotate(${(2 - index) * 9}deg) scale(.9)` }}
        animate={{ opacity: 1, transform: `translateX(0) translateY(${Math.abs(index - 2) * 6}px) rotate(${(index - 2) * 2}deg) scale(1)` }}
        transition={reduced ? { duration: 0 } : { duration: DURATIONS.pageEnter, ease: EASINGS.emilOut }}
        className={`li-station${selected === index ? ' is-selected' : ''}${completed.includes(index) ? ' is-complete' : ''}`}
        aria-pressed={selected === index} onClick={() => setSelected(index)}>
        <span className="li-station-orb">{completed.includes(index) ? <Check size={24} /> : <BookOpen size={24} />}</span>
        <strong>Chặng {index + 1}</strong><span>{completed.includes(index) ? 'Đã thử xong' : 'Nhấn khám phá'}</span>
      </motion.button>)}
    </div>
    <div className="li-station-workbench">
      <div><strong>Chặng mẫu {selected + 1}</strong><p>Đọc lý thuyết. Thử câu hỏi. Ghi dấu tiến bộ.</p></div>
      <button type="button" className="lx-button" onClick={() => setCompleted(previous => done ? previous.filter(index => index !== selected) : [...previous, selected])}>{done ? 'Thử lại chặng' : 'Thử hoàn thành'}{done ? <RotateCcw size={17} /> : <Check size={17} />}</button>
    </div>
    <div className="li-sample-progress"><span role="status">{completed.length}/5 chặng mẫu đã thử</span><div role="progressbar" aria-label="Tiến độ chặng mẫu" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={5}><motion.i initial={false} animate={{ transform: `scaleX(${completed.length / 5})` }} transition={{ duration: reduced ? 0 : DURATIONS.tabSwitch, ease: EASINGS.emilOut }} /></div></div>
  </div>;
}

export function RoadmapTracks() {
  const [open, setOpen] = useState(null);
  const reduced = useReducedMotion();
  return <section className="lx-section lx-roadmap li-roadmap" id="lo-trinh" aria-labelledby="lx-route-title">
    <div className="mtl-shell">
      <div className="lx-intro li-aurora-heading"><span className="lx-label"><Layers size={17} /> Lộ trình học</span><h2 id="lx-route-title">Chọn hướng.<br /><em>Mở đường đi.</em></h2><p>Nhấn một định hướng, mở 5 chặng để thử.</p></div>
      <div className="li-track-grid">{TRACKS.map(track => {
        const Icon = track.icon;
        return <button key={track.id} type="button" className={`li-track li-theme-${track.id}${open === track.id ? ' is-open' : ''}`} aria-expanded={open === track.id} aria-controls="li-station-region" onClick={() => setOpen(previous => previous === track.id ? null : track.id)}>
          <span className="li-track-top"><span className="li-track-icon"><Icon size={34} /></span><b>{track.code}</b></span>
          <strong>{track.label}</strong><span className="li-track-note">{track.note}</span>
          <span className="li-track-action">{open === track.id ? 'Thu gọn chặng mẫu' : 'Mở 5 chặng mẫu'}<ChevronDown size={21} className={open === track.id ? 'is-up' : ''} /></span>
        </button>;
      })}</div>
      <div id="li-station-region"><AnimatePresence initial={false}>{open && <motion.div key={open} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : DURATIONS.micro }}><SampleStations track={TRACKS.find(track => track.id === open)} /></motion.div>}</AnimatePresence></div>
    </div>
  </section>;
}

const METRICS = [
  { label: 'Chuỗi streak', value: 7, suffix: ' ngày', icon: Flame, color: '#c6510c' },
  { label: 'Đề đã hoàn thành', value: 14, suffix: ' đề', icon: BookOpen, color: '#b57b12' },
  { label: 'Điểm trung bình', value: 8.9, decimals: 1, suffix: '/10', icon: Trophy, color: '#537739' },
  { label: 'Độ chính xác', value: 78, suffix: '%', icon: Target, color: '#bc513b' },
];
const KNOWLEDGE = [
  { label: 'Lập trình & Python', value: 72, icon: Code2, accent: '#e26a1b' },
  { label: 'Cơ sở dữ liệu & SQL', value: 54, icon: Database, accent: '#cb901e' },
  { label: 'Mạng máy tính & Internet', value: 86, icon: Globe2, accent: '#a85526' },
  { label: 'An toàn số & Đạo đức ICT', value: 63, icon: ShieldCheck, accent: '#668b45' },
];

function HomeMetric({ metric }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, amount: .5 });
  const Icon = metric.icon;
  return <div className="li-home-metric" ref={ref} style={{ '--metric-accent': metric.color }}>
    <Icon size={26} /><strong aria-label={`${metric.value}${metric.suffix}`}><CountUpNumber end={visible ? metric.value : 0} decimals={metric.decimals ?? 0} duration={DURATIONS.countUp * 1000} /><small>{metric.suffix}</small></strong><span>{metric.label}</span>
  </div>;
}

function KnowledgeCard({ block }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, amount: .5 });
  const reduced = useReducedMotion();
  const Icon = block.icon;
  return <article className="li-knowledge-card" ref={ref} style={{ '--mastery-accent': block.accent }}>
    <div><span className="li-knowledge-icon"><Icon size={24} /></span><h3>{block.label}</h3><strong aria-label={`${block.value}%`}><CountUpNumber end={visible ? block.value : 0} decimals={0} suffix="%" duration={DURATIONS.countUp * 1000} /></strong></div>
    <div className="li-mastery-track" role="progressbar" aria-label={block.label} aria-valuenow={block.value} aria-valuemin={0} aria-valuemax={100}><motion.span initial={false} animate={{ transform: `scaleX(${visible ? block.value / 100 : 0})` }} transition={{ duration: reduced ? 0 : DURATIONS.countUp, ease: EASINGS.emilOut }} /></div>
  </article>;
}

export function HomeShowcase({ onStart }) {
  return <section className="lx-section li-home-section" id="giao-dien-home" aria-labelledby="li-home-title">
    <div className="mtl-shell">
      <div className="li-home-heading"><div className="li-aurora-heading"><span className="lx-label">Giao diện Home</span><h2 id="li-home-title">Giữ nhịp học.<br /><em>Thấy tiến bộ.</em></h2></div><div><p>Bốn con số. Một bản đồ kiến thức của bạn.</p><button type="button" className="lx-text-button" onClick={onStart}>Vào học cùng Mew <ArrowRight size={18} /></button></div></div>
      <div className="li-home-block"><div className="li-block-heading"><h3>Nhịp học của bạn</h3><span>Minh hoạ giao diện</span></div><div className="li-home-metrics">{METRICS.map(metric => <HomeMetric metric={metric} key={metric.label} />)}</div></div>
      <div className="li-home-block li-mastery-panel"><div className="li-block-heading"><h3>Bản đồ kiến thức</h3><span>Tiến độ minh hoạ</span></div><div className="li-knowledge-grid">{KNOWLEDGE.map(block => <KnowledgeCard block={block} key={block.label} />)}</div></div>
    </div>
  </section>;
}
