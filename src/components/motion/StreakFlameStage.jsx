import React, { useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import StreakEvolutionArt from '../StreakEvolutionArt';
import { DURATIONS, EASINGS } from '../../variants';

// Chuyển động nhẹ tôn vinh chuỗi đã tích luỹ, dừng khi ra ngoài vùng nhìn.
export default function StreakFlameStage({ currentEvolution, hasStarted, displayStreak, evoVars }) {
  const stageRef = useRef(null);
  const inView = useInView(stageRef, { amount: 0.2 });
  const reducedMotion = useReducedMotion();
  return (
    <div ref={stageRef} className={'streak-evo-stage study-streak-flame-stage ' + (hasStarted ? 'is-earned ' : '') + (hasStarted && inView && !reducedMotion ? 'is-animated' : '')}
      style={{ ...evoVars, '--streak-float-duration': `${DURATIONS.ambientSlow / 2}s`, '--streak-motion-ease': `cubic-bezier(${EASINGS.easeInOut.join(',')})` }}>
      <div className="study-streak-flame-halo" aria-hidden="true" />
      <div className="study-streak-flame-pedestal" aria-hidden="true" />
      <div className="streak-flame-wrapper" title={hasStarted ? currentEvolution.name : 'Chưa mở khoá'}>
        <StreakEvolutionArt id={currentEvolution.id} mono={!hasStarted} size={116} />
      </div>
      {hasStarted && <div className="study-streak-embers" aria-hidden="true"><i /><i /><i /></div>}
      <span className="streak-evo-name">{displayStreak > 0 ? currentEvolution.name : 'Chưa bắt đầu'}</span>
    </div>
  );
}
