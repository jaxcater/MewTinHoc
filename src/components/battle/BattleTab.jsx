import React, { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, CheckCheck, Clock3, Copy, Flag, KeyRound, LoaderCircle, Trophy, Users, Zap } from 'lucide-react';
import { useBattle } from '../../lib/useBattle';
import { resolveAvatarSrc, nextAvatarFallbackSrc } from '../../lib/defaultAvatar';
import { EASINGS, DURATIONS, SPRINGS } from '../../variants';
import FeatureBanner from '../FeatureBanner';
import './battle.css';

function Avatar({ player, className = '' }) {
  const [fallback, setFallback] = useState(null);
  const src = fallback || resolveAvatarSrc(player.avatar, player.name);
  return <img className={`battle-avatar ${className}`} src={src} alt={player.name} referrerPolicy="no-referrer"
    onError={() => setFallback(nextAvatarFallbackSrc(src))} />;
}

const RaceTrack = memo(function RaceTrack({ players, me }) {
  const reduced = useReducedMotion();
  const rail = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    if (rail.current) observer.observe(rail.current);
    return () => observer.disconnect();
  }, []);
  return <section className="battle-race" aria-label="Tiến độ hoàn thành câu hỏi">
    <div className="battle-race-caption"><span><Flag size={16} /> Đường đua kiến thức</span><span>20 câu · Về đích</span></div>
    <div className="battle-track" ref={rail}>
      <div className="battle-track-line" />
      <span className="battle-finish" aria-hidden="true"><Flag size={22} /></span>
      {players.map((player, index) => <motion.div key={player.id} className={`battle-runner ${player.id === me ? 'is-me' : ''}`}
        style={{ top: index * 28 }} animate={{ transform: `translateX(${Math.max(0, width - 48) * player.completed / 20}px)` }}
        transition={reduced ? { duration: 0 } : { duration: DURATIONS.tabSwitch, ease: EASINGS.emilOut }}
        title={`${player.name}: ${player.completed}/20 câu`}>
        <Avatar player={player} /><span>{player.completed}</span>
      </motion.div>)}
    </div>
    <div className="battle-race-legend">{players.map(p => <span key={p.id}><Avatar player={p} />
      <span>{p.id === me ? 'Bạn' : p.name}</span><b>{p.completed}/20</b>{p.submitted && <CheckCheck size={15} />}</span>)}</div>
  </section>;
});

function Clock({ room, offset }) {
  const [time, setTime] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setTime(Date.now()), 250); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.ceil((room.deadline - time - offset.current) / 1000));
  return <span className={`battle-clock ${seconds < 60 ? 'is-urgent' : ''}`} aria-label={`Còn ${Math.floor(seconds / 60)} phút ${seconds % 60} giây`}>
    <Clock3 size={18} />{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
  </span>;
}

function ModeRewards({ privateRoom = false }) {
  const rewards = privateRoom ? [50, 20, 0] : [100, 50, 0];
  return <span className="battle-mode-rewards" aria-label="Thưởng EXP theo thứ hạng">
    {rewards.map((xp, index) => <span key={index}>
      <small>Hạng {index + 1}</small><b>+{xp}<span> EXP</span></b>
    </span>)}
  </span>;
}

function ModeSelection({ enter, busy }) {
  const [code, setCode] = useState('');
  return <>
    <FeatureBanner variant="arena" eyebrow="MewTinHoc · Đấu trường"
      title={<>Kiến thức lên tiếng.<br /><span>Tốc độ tạo khác biệt.</span></>}
      description="Ba người, cùng một đề. Chọn chính xác, bứt tốc đúng lúc và giành vị trí dẫn đầu.">
      <div className="battle-facts"><span><Users size={17} /> 3 người / trận</span><span><Flag size={17} /> 20 câu hỏi</span><span><Clock3 size={17} /> 15 phút</span><span><Trophy size={17} /> Tối đa 100 EXP</span></div>
    </FeatureBanner>
    <div className="battle-modes">
      <button className="battle-mode battle-mode-random" disabled={busy} onClick={() => enter('random')}>
        <div className="battle-mode-art" aria-hidden="true"><Zap size={52} strokeWidth={1.4} /><span className="battle-orbit">×3</span></div>
        <span className="battle-mode-copy"><strong>Ghép ngẫu nhiên</strong><span>Gặp hai đối thủ mới.<br />Sẵn sàng cho một cuộc đua?</span></span>
        <ModeRewards />
        <span className="battle-mode-cta">{busy ? 'Đang kết nối…' : 'Tìm trận'}<ArrowRight size={20} /></span>
      </button>
      <button className="battle-mode battle-mode-private" disabled={busy} onClick={() => enter('private')}>
        <div className="battle-mode-art" aria-hidden="true"><Users size={52} strokeWidth={1.4} /></div>
        <span className="battle-mode-copy"><strong>Đấu cùng bạn bè</strong><span>Tạo phòng riêng, gửi mã mời.<br />Cùng nhau chinh phục 20 câu.</span></span>
        <ModeRewards privateRoom />
        <span className="battle-mode-cta">{busy ? 'Đang kết nối…' : 'Tạo phòng'}<ArrowRight size={20} /></span>
      </button>
    </div>
    <form className="battle-join" onSubmit={e => { e.preventDefault(); if (code.length === 8) enter('join', code); }}>
      <label htmlFor="battle-code"><KeyRound size={18} /> Đã có mã phòng?</label>
      <input id="battle-code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))}
        placeholder="Nhập mã 8 ký tự" autoComplete="off" spellCheck={false} maxLength={8} />
      <button className="battle-button secondary" disabled={busy || code.length !== 8}>Vào phòng<ArrowRight size={16} /></button>
    </form>
    <p className="battle-quota-note"><Clock3 size={17} aria-hidden="true" /><span>Mỗi chế độ có tối đa 10 lượt nhận EXP/ngày, làm mới lúc 00:00 giờ Việt Nam. Hết lượt vẫn chơi bình thường; hạng 3 không dùng lượt.</span></p>
    <details className="battle-rules"><summary>Cách tính điểm và phần thưởng</summary><p>Mỗi câu tối đa 100 điểm chính xác + 30 điểm tốc độ. Câu đúng/sai tính 25 điểm mỗi ý đúng; thưởng tốc độ theo tỷ lệ ý đúng. Thời gian tính từ lúc bắt đầu trận đến lần đổi lựa chọn cuối cùng mà server nhận được. Sai không được điểm.</p><p>Ghép ngẫu nhiên: hạng 1 nhận 100 EXP, hạng 2 nhận 50 EXP. Phòng riêng: hạng 1 nhận 50 EXP, hạng 2 nhận 20 EXP. Hạng 3 nhận 0 EXP ở cả hai chế độ.</p><p>Mỗi tài khoản được nhận EXP tối đa 10 lần mỗi ngày cho từng chế độ. Chỉ lần thực sự được cộng EXP mới dùng lượt. Tính ngày theo thời điểm kết thúc trận, giờ Việt Nam; sau giới hạn vẫn tính điểm và xếp hạng trận, nhưng nhận 0 EXP.</p><p>Nếu bằng điểm, ưu tiên người nộp sớm; nếu vẫn bằng nhau, thứ tự ID tài khoản quyết định. Chỉ được nộp khi hoàn thành đủ 20 câu. Hết 15 phút, hệ thống tự nộp phần đã lưu.</p></details>
  </>;
}

function Lobby({ room, ready, leave, busy }) {
  const me = room.players.find(p => p.id === room.me);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const privateRoom = room.mode === 'private';
  const readyCount = room.players.filter(p => p.ready).length;
  return <div className="battle-lobby">
    <button className="battle-back" onClick={leave} disabled={busy}><ArrowLeft size={17} /> Chọn chế độ khác</button>
    <FeatureBanner variant="arena" eyebrow={privateRoom ? 'MewTinHoc · Phòng riêng' : 'MewTinHoc · Ghép ngẫu nhiên'}
      title={room.players.length < 3 ? <>Chờ đồng đội <span>vào sân.</span></> : <>Đủ mặt. <span>Sẵn sàng thôi!</span></>}
      description={room.players.length === 3 ? 'Đã đủ ba người trong phòng. Cùng xác nhận sẵn sàng để bắt đầu cuộc đua.' : privateRoom ? 'Gửi mã mời cho hai người bạn. Cùng vào vị trí, sẵn sàng và bắt đầu cuộc đua.' : 'Đang tìm đủ ba người. Vào vị trí, sẵn sàng và để kiến thức lên tiếng.'}>
      <div className="battle-facts">
        <span><Users size={17} /> {room.players.length}/3 người đã vào</span>
        <span><CheckCheck size={17} /> {readyCount}/3 đã sẵn sàng</span>
        <span><Flag size={17} /> 20 câu hỏi</span><span><Clock3 size={17} /> 15 phút</span>
      </div>
    </FeatureBanner>
    {privateRoom && <div className="battle-invite">
      <div className="battle-invite-copy"><KeyRound size={22} aria-hidden="true" /><div><strong>Mã mời bạn bè</strong><p>Gửi mã này để cùng vào phòng.</p></div></div>
      <div className="battle-room-code"><span>{room.code}</span><button aria-label="Sao chép mã phòng" onClick={async () => {
        try { await navigator.clipboard.writeText(room.code); setCopied(true); setCopyFailed(false); }
        catch { setCopyFailed(true); }
      }}>{copied ? <Check size={20} /> : <Copy size={20} />}</button></div>
      <span className="battle-copy-status" role="status">{copyFailed ? 'Hãy chọn mã phía trên để sao chép.' : copied ? 'Đã sao chép mã phòng' : 'Mã đổi khi chủ phòng tạo lại.'}</span>
    </div>}
    <section className="battle-lobby-team" aria-labelledby="battle-team-title">
      <div className="battle-team-heading"><h2 id="battle-team-title">Đội hình thi đấu</h2><span>{room.players.length}/3 vị trí đã có người</span></div>
      <div className="battle-seats">{Array.from({ length: 3 }, (_, i) => {
        const player = room.players[i];
        const isMe = player?.id === room.me;
        return <article className={`battle-seat${player ? ' is-occupied' : ' is-empty'}${isMe ? ' is-me' : ''}${player?.ready ? ' is-ready' : ''}`} key={player?.id || i}>
          <div className="battle-seat-top"><span>Vị trí {i + 1}</span>{isMe && <span className="battle-seat-you">Bạn</span>}</div>
          <div className="battle-seat-portrait">
            {player ? <Avatar player={player} /> : <Users size={36} aria-hidden="true" />}
            {player?.ready && <span className="battle-seat-check" aria-hidden="true"><Check size={16} /></span>}
          </div>
          <strong className="battle-seat-name" title={player?.name}>{player ? player.name : 'Đang chờ người chơi'}</strong>
          <span className="battle-seat-status">{player?.ready ? <><Check size={15} /> Đã sẵn sàng</> : player ? <><Clock3 size={15} /> Chưa sẵn sàng</> : <><Users size={15} /> Chỗ dành cho đối thủ</>}</span>
        </article>;
      })}</div>
    </section>
    <div className="battle-lobby-action">
      <div><strong>{me.ready ? 'Bạn đã vào vị trí!' : 'Sẵn sàng cho cuộc đua?'}</strong><p role="status">{readyCount}/3 người đã sẵn sàng · Trận bắt đầu khi cả ba xác nhận.</p></div>
      <button className={`battle-button battle-ready-toggle${me.ready ? ' secondary' : ''}`} disabled={busy} onClick={() => ready(!me.ready)}>{me.ready ? 'Huỷ sẵn sàng' : 'Tôi đã sẵn sàng'}<Check size={18} /></button>
    </div>
    <div className="battle-lobby-details">
      <p className="battle-lobby-reward"><Trophy size={16} aria-hidden="true" />{privateRoom ? 'Hạng 1 +50 · Hạng 2 +20 · Hạng 3 +0 EXP' : 'Hạng 1 +100 · Hạng 2 +50 · Hạng 3 +0 EXP'}</p>
      <p>Tối đa 10 lượt nhận EXP/ngày ở chế độ này. Hết lượt vẫn có thể thi đấu.</p>
    </div>
  </div>;
}

function isComplete(q, entry) {
  const value = entry?.value;
  return q.type === 'mcq' ? Number.isInteger(value) : Array.isArray(value) && value.length === 4 && value.every(v => typeof v === 'boolean');
}

function Match({ battle }) {
  const { room, answers, answer, submit, busy, pending, clockOffset } = battle;
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setTime(Date.now()), 250); return () => clearInterval(timer); }, []);
  const question = room.questions[index];
  const value = answers[question.id]?.value;
  const complete = room.questions.filter(q => isComplete(q, answers[q.id])).length;
  const countdown = Math.max(0, Math.ceil((room.startedAt - time - clockOffset.current) / 1000));
  const expired = time + clockOffset.current >= room.deadline;
  const locked = countdown > 0 || expired;
  return <>
    <div className="battle-match-header"><div><span className="battle-eyebrow">Đấu trường · Đang thi đấu</span><h1>Giữ nhịp. Vững đáp án.</h1></div><Clock room={room} offset={clockOffset} /></div>
    <RaceTrack players={room.players} me={room.me} />
    {countdown > 0 && <div className="battle-countdown" role="status">Cùng bắt đầu sau <b>{countdown}</b></div>}
    {expired && <p className="battle-notice" role="status">Đã hết giờ. Hệ thống đang chốt bài đã lưu của bạn.</p>}
    <div className="battle-workspace">
      <section className="battle-question" aria-labelledby="battle-question-heading">
        <div className="battle-question-meta"><span>Câu {index + 1}<span className="battle-muted"> / 20</span></span><span>{question.type === 'tf' ? 'Đúng / Sai · 4 ý' : 'Chọn một đáp án'}</span></div>
        <h2 id="battle-question-heading">{question.stem}</h2>
        {question.type === 'mcq' ? <div className="battle-options" role="group" aria-label="Đáp án">
          {question.options.map((option, i) => <button key={i} disabled={locked} aria-pressed={value === i}
            className={`battle-option ${value === i ? 'is-selected' : ''}`} onClick={() => answer(question.id, i)}>
            <span className="battle-option-letter">{'ABCD'[i]}</span><span>{option}</span>{value === i && <Check size={18} />}
          </button>)}
        </div> : <div className="battle-statements">{question.statements.map((text, i) => <div className="battle-statement" key={i}>
          <p><b>{'abcd'[i]}.</b> {text}</p><div role="group" aria-label={`Ý ${'abcd'[i]}`}>
            {[true, false].map(choice => <button key={String(choice)} aria-pressed={value?.[i] === choice} disabled={locked}
              className={value?.[i] === choice ? 'is-selected' : ''} onClick={() => {
                const next = value ? [...value] : [null, null, null, null]; next[i] = choice; answer(question.id, next);
              }}>{choice ? 'Đúng' : 'Sai'}</button>)}
          </div></div>)}</div>}
        <div className="battle-question-footer"><button className="battle-button secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={17} /> Câu trước</button>
          {index < 19 ? <button className="battle-button" onClick={() => setIndex(index + 1)}>Câu tiếp<ArrowRight size={17} /></button>
            : <button className="battle-button" onClick={() => { const first = room.questions.findIndex(q => !isComplete(q, answers[q.id])); if (first >= 0) setIndex(first); }} disabled={complete === 20}>Tìm câu còn trống</button>}
        </div>
      </section>
      <aside className="battle-navigator"><div><h2>Bài làm của bạn</h2><p><b>{complete}</b> / 20 câu hoàn thành</p></div>
        <div className="battle-question-grid">{room.questions.map((q, i) => <button key={q.id} onClick={() => setIndex(i)}
          aria-label={`Câu ${i + 1}${isComplete(q, answers[q.id]) ? ', đã hoàn thành' : ', chưa hoàn thành'}`} aria-current={i === index ? 'step' : undefined}
          className={`${isComplete(q, answers[q.id]) ? 'is-done' : ''} ${index === i ? 'is-current' : ''}`}>{i + 1}</button>)}</div>
        <p className="battle-save-state" role="status">{Object.keys(pending).length ? <><LoaderCircle size={15} /> Đang lưu {Object.keys(pending).length} câu…</> : <><CheckCheck size={16} /> Đã lưu các lựa chọn</>}</p>
        <button className="battle-button" onClick={submit} disabled={busy || locked || complete !== 20 || Object.keys(pending).length > 0}>Nộp bài<Flag size={17} /></button>
        <p className="battle-muted">{complete < 20 ? `Hoàn thành ${20 - complete} câu còn lại để nộp bài.` : 'Bạn đã hoàn thành. Sẵn sàng về đích!'} Bạn có thể sửa đáp án trước khi nộp.</p>
      </aside>
    </div>
  </>;
}

function Celebration({ rank, waiting, reduced }) {
  useEffect(() => {
    if (reduced || waiting || rank > 2) return;
    let cancelled = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (!cancelled) confetti({ particleCount: rank === 1 ? 100 : 65, spread: 80, origin: { y: 0.6 },
        colors: ['#EA580C', '#FBBF24', '#FFF1D6'], disableForReducedMotion: true });
    });
    return () => { cancelled = true; };
  }, [rank, waiting, reduced]);
  return <motion.div className={`battle-trophy ${waiting ? 'is-waiting' : ''}`} initial={reduced ? false : { opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }} transition={reduced ? { duration: 0 } : SPRINGS.rewardPop}>
    {waiting ? <CheckCheck size={62} strokeWidth={1.5} /> : <Trophy size={68} strokeWidth={1.4} />}
    {!waiting && <span>#{rank}</span>}
  </motion.div>;
}

function Waiting({ room, reduced, offset }) {
  const me = room.players.find(p => p.id === room.me);
  return <div className="battle-end"><Celebration waiting reduced={reduced} />
    <span className="battle-eyebrow">{me.autoSubmitted ? 'Đã tự động nộp bài' : 'Hoàn thành lượt đua'}</span>
    <h1>{me.autoSubmitted ? 'Bài làm đã được ghi nhận.' : 'Chúc mừng bạn đã về đích!'}</h1>
    <p>Bài của bạn đã được lưu. Kết quả sẽ mở khi cả ba người hoàn thành.</p>
    <div className="battle-wait-players">{room.players.map(p => <div key={p.id}><Avatar player={p} /><strong>{p.id === room.me ? 'Bạn' : p.name}</strong><span>{p.submitted ? <><CheckCheck size={16} /> Đã nộp bài</> : `${p.completed}/20 câu`}</span></div>)}</div>
    <p role="status">{room.players.filter(p => p.submitted).length}/3 người đã nộp bài</p><Clock room={room} offset={offset} />
  </div>;
}

function Results({ room, leave, busy, reduced }) {
  const me = room.results.find(p => p.id === room.me);
  const awardedXp = me.awardedXp ?? (room.rewardStatus === 'paid' || me.xp === 0 ? me.xp : null);
  return <div className="battle-end battle-results"><Celebration rank={me.rank} reduced={reduced} />
    <span className="battle-eyebrow">Đấu trường · Kết quả cuối cùng</span>
    <h1>{me.rank === 1 ? 'Ngôi đầu thuộc về bạn!' : me.rank === 2 ? 'Một màn bứt tốc đáng nhớ!' : 'Mỗi trận là một bước tiến.'}</h1>
    <p>{me.rank < 3 ? 'Chúc mừng! Kiến thức và tốc độ của bạn đã tạo nên thành quả.' : 'Bạn đã có thêm một lần thử sức. Hẹn gặp ở cuộc đua tiếp theo.'}</p>
    <div className="battle-exp">{awardedXp === null ? '…' : `+${awardedXp}`}<span>EXP</span></div>
    {me.xp > 0 && <p className="battle-muted" role="status">{me.rewardLimitReached
      ? 'Đã đạt giới hạn 10 lượt nhận EXP/ngày ở chế độ này. Bạn vẫn có thể tiếp tục thi đấu.'
      : room.rewardStatus === 'paid' ? 'Đã cộng vào thành tích của bạn' : 'Đang kiểm tra lượt nhận thưởng và đồng bộ EXP'}</p>}
    {awardedXp > 0 && me.rewardUsed != null && <p className="battle-muted">Đã dùng {me.rewardUsed}/10 lượt nhận EXP của chế độ này trong ngày kết thúc trận.</p>}
    <div className="battle-ranking">{room.results.map(p => <div key={p.id} className={`battle-rank-row ${p.id === room.me ? 'is-me' : ''}`}>
      <b className="battle-place">{p.rank === 1 ? <Trophy size={24} /> : `0${p.rank}`}</b><Avatar player={p} />
      <div className="battle-rank-person"><strong>{p.name}{p.id === room.me && ' (Bạn)'}</strong><span>{p.correctUnits.toLocaleString('vi-VN')} / 20 điểm đúng quy đổi · {p.autoSubmitted ? 'Tự nộp khi hết giờ' : 'Đã nộp bài'}</span></div>
      <div className="battle-rank-score"><b>{p.score.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</b><span>điểm</span></div><strong className="battle-rank-xp">{p.awardedXp != null ? `+${p.awardedXp}` : room.rewardStatus === 'paid' || p.xp === 0 ? `+${p.xp}` : '…'} EXP</strong>
    </div>)}</div>
    <p className="battle-score-detail">Điểm của bạn: {me.accuracyPoints.toLocaleString('vi-VN')} chính xác + {me.speedPoints.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tốc độ.</p>
    <button className="battle-button" disabled={busy} onClick={leave}>Về sảnh đấu<ArrowRight size={18} /></button>
  </div>;
}

export default function BattleTab({ user }) {
  const battle = useBattle(user);
  const reduced = useReducedMotion();
  const { room, loading, error, retry, pending } = battle;
  const me = room?.players.find(p => p.id === room.me);
  const screen = !room ? 'select' : room.status === 'finished' ? 'results' : room.status === 'waiting' ? 'lobby' : me.submitted ? 'waiting' : 'match';
  return <div className="battle-page">
    {error && <div className="battle-error" role="alert"><span>{error}</span>{Object.keys(pending).length > 0 && <button onClick={retry}>Thử lưu lại</button>}</div>}
    {loading ? <div className="battle-loading" role="status"><LoaderCircle size={28} /><p>Đang kết nối Đấu trường…</p></div> :
      <AnimatePresence mode="wait" initial={false}><motion.div key={screen}
        initial={reduced ? false : { opacity: 0, transform: 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0)' }}
        exit={{ opacity: 0, transition: { duration: reduced ? 0 : DURATIONS.pageExit } }}
        transition={{ duration: reduced ? 0 : DURATIONS.tabSwitch, ease: EASINGS.emilOut }}>
        {screen === 'select' && <ModeSelection enter={battle.enter} busy={battle.busy} />}
        {screen === 'lobby' && <Lobby room={room} ready={battle.ready} leave={battle.leave} busy={battle.busy} />}
        {screen === 'match' && <Match battle={battle} />}
        {screen === 'waiting' && <Waiting room={room} reduced={reduced} offset={battle.clockOffset} />}
        {screen === 'results' && <Results room={room} leave={battle.leave} busy={battle.busy} reduced={reduced} />}
      </motion.div></AnimatePresence>}
  </div>;
}
