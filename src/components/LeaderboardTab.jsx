import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, CircleHelp, RefreshCw, Trophy, Zap } from 'lucide-react';
import { useLeaderboard } from '../lib/useLeaderboard';
import { getGoogleAvatarUrl, getOvertakeGap } from '../lib/leaderboardModel';
import { DURATIONS, EASINGS, leaderboardHonorsVariants, leaderboardHonorVariants } from '../variants';
import badgeAtlas from '../assets/leaderboard/rank-badges.png';
import './leaderboard.css';
import FeatureBanner from './FeatureBanner';

const number = new Intl.NumberFormat('vi-VN');
const compact = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const formatXp = value => value >= 10000000 ? compact.format(value) : number.format(value);
const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
const RANK_TITLES = ['Dẫn đầu hành trình', 'Bứt phá mỗi ngày', 'Bản lĩnh vươn lên', 'Bền bỉ tiến bước', 'Nuôi dưỡng đam mê'];
// Atlas rộng 2172px; các huy hiệu có bề rộng khác nhau, không chia đều thành 5 ô.
const BADGE_REGIONS = [[0, 453], [453, 418], [871, 417], [1288, 438], [1726, 446]];

function RankBadge({ rank, large = false }) {
  const clipId = useId();
  if (rank > 5) return <span className="lb-rank-number">{number.format(rank)}</span>;
  const [left, width] = BADGE_REGIONS[rank - 1];
  return <svg className={`lb-badge ${large ? 'lb-badge--large' : ''}`} role="img" aria-label={`Huy hiệu hạng ${rank}`}
    viewBox={`${left} 0 ${width} 724`} preserveAspectRatio="xMidYMid meet" focusable="false">
    <defs><clipPath id={clipId}><rect x={left} width={width} height="724" /></clipPath></defs>
    <image href={badgeAtlas} width="2172" height="724" clipPath={`url(#${clipId})`} />
  </svg>;
}

function UserAvatar({ entry, user }) {
  const { name, id } = entry;
  const avatarUrl = entry.avatarUrl || (id === user?.id ? getGoogleAvatarUrl(user.avatar) : null);
  const [failedUrl, setFailedUrl] = useState(null);
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase('vi-VN') || 'M';
  const shade = Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  return <span className={`lb-avatar lb-avatar--${shade}`} aria-hidden="true">
    {avatarUrl && avatarUrl !== failedUrl
      ? <img key={avatarUrl} src={avatarUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
        onError={() => setFailedUrl(avatarUrl)} />
      : initial}
  </span>;
}

function PersonalStanding({ board, isDemo }) {
  const own = board?.self;
  const gap = getOvertakeGap(board);
  return <section className="lb-personal" aria-labelledby="lb-personal-title">
    <div className="lb-section-heading"><h2 id="lb-personal-title">Dấu ấn của bạn</h2><Zap size={18} aria-hidden="true" /></div>
    {own ? <>
      <div className="lb-own-standing">{own.rank <= 5 ? <RankBadge rank={own.rank} large /> : <Trophy className="lb-own-trophy" size={48} strokeWidth={1.3} aria-hidden="true" />}<div><span>Hạng hiện tại</span><strong>#{number.format(own.rank)}</strong></div></div>
      <div className="lb-own-exp"><span>EXP đã tích lũy</span><strong title={`${number.format(own.xp)} EXP`} aria-label={`${number.format(own.xp)} EXP`}>{formatXp(own.xp)} <small>EXP</small></strong></div>
      <p className="lb-personal-note">{gap == null ? 'Bạn đang ở nhóm dẫn đầu. Giữ nhịp học để tiếp tục tỏa sáng!' : <>Thêm <strong>{number.format(gap)} EXP</strong> để vượt mức EXP gần nhất phía trên.</>}</p>
      {board.nextXp != null && <div className="lb-next-milestone"><div><span>Mốc vượt tiếp theo</span><strong>{number.format(board.nextXp + 1)} EXP</strong></div><progress value={own.xp} max={board.nextXp + 1} aria-label="Tiến độ đến mốc EXP tiếp theo" /></div>}
    </> : <div className="lb-unranked"><Trophy size={32} strokeWidth={1.4} aria-hidden="true" /><h3>{isDemo ? 'Một hành trình đang chờ bạn' : 'Bắt đầu dấu ấn đầu tiên'}</h3><p>{isDemo ? 'Đăng nhập bằng Google để tích lũy EXP và góp mặt cùng cộng đồng Mew.' : board ? 'Tích lũy EXP và đồng bộ tiến độ để xuất hiện trên bảng thành tích.' : 'Thành tích cá nhân sẽ xuất hiện khi tải được bảng xếp hạng.'}</p></div>}
    <Link className="lb-study-link" to="/roadmap">Tiếp tục học <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}

export default function LeaderboardTab({ user }) {
  const { board, loading, error, reload, goToPage, isDemo } = useLeaderboard(user);
  const reduced = useReducedMotion();
  const stale = Boolean(board && error);
  const motionTokens = { duration: DURATIONS.tabSwitch, ease: EASINGS.emilOut };
  const errorMessage = error === 'SETUP_REQUIRED'
    ? 'Bảng thành tích đang được chuẩn bị. Vui lòng quay lại sau.'
    : error === 'AUTH_REQUIRED' ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem thành tích.'
      : 'Chưa kết nối được bảng thành tích. Vui lòng thử lại.';

  return <div className="leaderboard" style={{ '--lb-motion-duration': `${DURATIONS.micro}s`,
    '--lb-sheen-duration': `${DURATIONS.countUp}s`, '--lb-sheen-delay': `${DURATIONS.tabSwitch}s` }}>
    <FeatureBanner variant="leaderboard" eyebrow="MewTinHoc · Bảng thành tích"
      title={<>Bảng thành tích<span aria-hidden="true">.</span></>}
      description="Mỗi lần học, một bước tiến. Cùng Mew chinh phục đỉnh tri thức.">
      <div className="lb-banner-footer">
      <button type="button" className="lb-refresh" onClick={reload} disabled={loading || isDemo} aria-label="Làm mới bảng thành tích">
        <motion.span animate={{ rotate: loading && !reduced ? 360 : 0 }} transition={loading && !reduced ? { duration: DURATIONS.countUp, repeat: Infinity, ease: 'linear' } : motionTokens}><RefreshCw size={16} aria-hidden="true" /></motion.span>
        <span>Làm mới</span>
      </button>
      </div>
    </FeatureBanner>

    <div className="lb-context"><span><span className="lb-context-dot" aria-hidden="true" />EXP toàn thời gian</span></div>

    {isDemo && <p className="lb-notice" role="status">Bạn đang dùng tài khoản Demo. Bảng xếp hạng thật chỉ dành cho học viên đã đăng nhập bằng Google.</p>}
    {error && <div className="lb-notice" role="alert"><span>{stale ? 'Kết nối gián đoạn. Đang hiển thị lần tải thành công gần nhất.' : errorMessage}</span><button type="button" disabled={loading} onClick={reload}>Thử lại</button></div>}

    {board?.top.length > 0 && <section className="lb-honors" aria-labelledby="lb-honors-title">
      <div className="lb-honors-heading"><div><h2 id="lb-honors-title">Dấu ấn Mew</h2><p>Nỗ lực hôm nay. Dấu ấn ngày mai.</p></div><Trophy size={24} strokeWidth={1.4} aria-hidden="true" /></div>
      <motion.div className="lb-honors-grid" style={{ '--lb-top-count': board.top.length }}
        initial={reduced ? false : 'hidden'} animate="visible" variants={leaderboardHonorsVariants}>
        {board.top.map(entry => <motion.article variants={reduced ? undefined : leaderboardHonorVariants}
          className={`lb-honor lb-honor--rank-${entry.rank}${entry.rank === 1 ? ' lb-honor--first' : ''}${entry.isMe ? ' lb-honor--me' : ''}`} key={entry.id}>
          <div className="lb-honor-topline"><span>#{number.format(entry.rank)}</span>{entry.isMe && <span className="lb-honor-you">Bạn</span>}</div>
          <div className="lb-honor-badge"><RankBadge rank={entry.rank} large /></div>
          <span className="lb-honor-rank">{RANK_TITLES[entry.rank - 1]}</span>
          <div className="lb-honor-identity"><UserAvatar entry={entry} user={user} /><h3 title={entry.name}>{entry.name}</h3></div>
          <p title={`${number.format(entry.xp)} EXP`} aria-label={`${number.format(entry.xp)} EXP`}>{formatXp(entry.xp)} <span>EXP</span></p>
          <span className="lb-honor-sheen" aria-hidden="true" />
        </motion.article>)}
      </motion.div>
    </section>}

    <div className="lb-main-grid">
      <section className="lb-list-panel" aria-labelledby="lb-list-title" aria-busy={loading}>
        <div className="lb-section-heading"><h2 id="lb-list-title">Cùng nhau tiến bộ</h2><span>{board ? `${stale ? 'Bản đã lưu' : 'Cập nhật'} ${time.format(new Date(board.updatedAt))} · giờ VN` : 'Xếp theo EXP'}</span></div>
        {loading && !board ? <div className="lb-loading" role="status"><span>Đang tìm những dấu ấn tri thức…</span>{Array.from({ length: 5 }, (_, i) => <div className="lb-skeleton" key={i}><i /><i /><i /></div>)}</div>
          : !board || board.entries.length === 0 ? <div className="lb-empty"><Trophy size={44} strokeWidth={1.2} aria-hidden="true" /><h3>{isDemo ? 'Hẹn bạn trên bảng thành tích' : error ? 'Chưa tải được thành tích' : 'Đỉnh tri thức chờ người mở lối'}</h3><p>{isDemo ? 'EXP trong chế độ Demo không tham gia xếp hạng.' : error ? errorMessage : 'Chưa có học viên có EXP đã đồng bộ. Học một bài và trở thành người đầu tiên!'}</p><Link to="/roadmap">Khám phá lộ trình <ArrowRight size={16} aria-hidden="true" /></Link></div>
            : <>
              <table className="lb-table"><caption className="lb-sr-only">Học viên xếp theo EXP giảm dần. Đồng EXP cùng thứ hạng.</caption><thead><tr><th scope="col">Hạng</th><th scope="col">Học viên</th><th scope="col">Tổng EXP</th></tr></thead>
                <tbody>{board.entries.map(entry => <tr key={entry.id} className={entry.isMe ? 'lb-row--me' : ''}>
                  <td><RankBadge rank={entry.rank} /></td><td><div className="lb-identity"><UserAvatar entry={entry} user={user} /><div><span className="lb-student-name" title={entry.name}>{entry.name}</span>{entry.isMe && <span className="lb-me-label">Bạn đang ở đây</span>}</div></div></td>
                  <td className="lb-exp" title={`${number.format(entry.xp)} EXP`} aria-label={`${number.format(entry.xp)} EXP`}>{formatXp(entry.xp)}<span> EXP</span></td>
                </tr>)}</tbody>
              </table>
              <nav className="lb-pagination" aria-label="Phân trang bảng thành tích"><span>{number.format(board.offset + 1)}–{number.format(board.offset + board.entries.length)} / {number.format(board.total)} học viên</span><div><button type="button" aria-label="Trang trước" disabled={loading || board.offset === 0} onClick={() => goToPage(Math.max(0, board.offset - board.limit))}><ChevronLeft size={18} /></button><span className="lb-page-number">{Math.floor(board.offset / board.limit) + 1}<span> / {Math.ceil(board.total / board.limit)}</span></span><button type="button" aria-label="Trang sau" disabled={loading || board.offset + board.limit >= board.total} onClick={() => goToPage(board.offset + board.limit)}><ChevronRight size={18} /></button></div></nav>
            </>}
      </section>

      <aside className="lb-sidebar"><PersonalStanding board={board} isDemo={isDemo} />
        <details className="lb-rules"><summary><CircleHelp size={16} aria-hidden="true" /> Cách tính thành tích</summary><div><p>EXP đã đồng bộ từ tiến độ học quyết định thứ hạng. EXP cao hơn luôn đứng trên.</p><p>Đồng EXP cùng hạng, ví dụ 1, 1, 3. Thứ tự trong nhóm đồng điểm được giữ ổn định theo mã tài khoản.</p><p>Cần có EXP lớn hơn 0 để tham gia. Điểm Demo, điểm mô phỏng và điểm chỉ lưu offline không được dùng để xếp hạng.</p><p>Bảng tự làm mới mỗi phút khi bạn đang mở trang. Thành tích tính toàn thời gian, không reset mỗi tuần.</p></div></details>
      </aside>
    </div>
    <p className="lb-footnote">Từng bước nhỏ hôm nay, thành tích lớn ngày mai.<span>MewTinHoc</span></p>
  </div>;
}
