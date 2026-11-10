import { Swords, Trophy } from 'lucide-react';
import './feature-banner.css';

/** Banner chung cho hai màn thi đấu, hình minh hoạ tĩnh để giữ thao tác mượt. */
export default function FeatureBanner({ variant, eyebrow, title, description, children }) {
  const isArena = variant === 'arena';
  const Icon = isArena ? Swords : Trophy;
  return <header className={`feature-banner feature-banner--${variant}`}>
    <div className="feature-banner-main">
      <div className="feature-banner-copy">
        <p className="feature-banner-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="feature-banner-description">{description}</p>
      </div>
      <div className="feature-banner-art" aria-hidden="true">
        {isArena ? <div className="feature-banner-emblem">
          <Swords strokeWidth={1.4} />
          <span className="feature-banner-player-count">3</span>
        </div> : <>
          <Icon className="feature-banner-symbol" strokeWidth={1.35} />
          <div className="feature-banner-podium"><span>2</span><span>1</span><span>3</span></div>
        </>}
      </div>
    </div>
    {children && <div className="feature-banner-footer">{children}</div>}
  </header>;
}
