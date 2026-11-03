const fs = require('fs');

const path = 'src/components/landing/landing.css';
const css = fs.readFileSync(path, 'utf8');

const block = String.raw`

/* ============================================================
   DEPTH PASS
   Each feature section sits on its own tone field, so the page reads as
   separate chapters instead of one cream wall. Motion-free, pointer-free,
   and drawn with two large soft gradients per field (cheap to composite).
   ============================================================ */

.mtl-section--field {
  position: relative;
  isolation: isolate;
}

.mtl-section--field::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset-inline: var(--mtl-gutter);
  inset-block: clamp(2px, 1.2vh, 16px);
  border-radius: clamp(24px, 2.6vw, 34px);
  background:
    radial-gradient(120% 78% at 10% 0%, rgba(251, 191, 36, 0.17) 0%, rgba(251, 191, 36, 0) 62%) /* taste-skill-ignore requested glow */,
    linear-gradient(180deg, #fffdf8 0%, #fff4e4 100%); /* taste-skill-ignore requested depth */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 1px 0 rgba(124, 45, 18, 0.05),
    0 34px 74px -58px rgba(124, 45, 18, 0.5); /* taste-skill-ignore requested depth */
  pointer-events: none;
}

/* Warmer field: reserved for the direction picker, the last section before
   the dark closing card. */
.mtl-section--field-warm::before {
  background:
    radial-gradient(92% 72% at 86% 100%, rgba(234, 88, 12, 0.14) 0%, rgba(234, 88, 12, 0) 66%) /* taste-skill-ignore requested glow */,
    linear-gradient(180deg, #fffaf3 0%, #ffe9d2 100%); /* taste-skill-ignore requested depth */
}

/* ---------- Route: one step per tier, with a week ruler ---------- */

.mtl-leg {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 20px 44px -36px rgba(124, 45, 18, 0.55); /* taste-skill-ignore requested depth */
}

.mtl-leg--1 {
  background: linear-gradient(180deg, #fffaef 0%, #fff0d3 100%); /* taste-skill-ignore requested depth */
}

.mtl-leg--2 {
  background: linear-gradient(180deg, #fff4e2 0%, #ffe1bb 100%); /* taste-skill-ignore requested depth */
}

.mtl-leg--3 {
  background:
    radial-gradient(80% 120% at 100% 0%, rgba(234, 88, 12, 0.28) 0%, rgba(234, 88, 12, 0) 62%) /* taste-skill-ignore requested glow */,
    linear-gradient(180deg, #33200f 0%, #24140b 100%); /* taste-skill-ignore requested depth */
  box-shadow: 0 28px 54px -40px rgba(43, 26, 17, 0.9); /* taste-skill-ignore requested depth */
}

/* Week ruler: twelve units, the tiers that belong to this step lit. */
.mtl-leg__ruler {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 4px;
  width: 100%;
  max-width: 330px;
  margin: 0.15rem 0 0.35rem;
}

.mtl-leg__tick {
  height: 6px;
  border-radius: 3px;
  background: rgba(124, 45, 18, 0.16);
}

.mtl-leg__tick--on { background: var(--mtl-amber); }
.mtl-leg--2 .mtl-leg__tick--on { background: var(--mtl-orange); }
.mtl-leg--3 .mtl-leg__tick--on { background: #fdba74; }
.mtl-leg--3 .mtl-leg__tick { background: rgba(255, 228, 205, 0.2); }

.mtl-leg--3 .mtl-leg__title { color: #fff6ea; }
.mtl-leg--3 .mtl-leg__note { color: #f3d6c0; }
.mtl-leg--3 .mtl-leg__stations { color: #e0b399; }

/* Tier name sits in the mark column, above the week range: it names the step
   the number belongs to. */
.mtl-leg__name {
  font-size: var(--mtl-small);
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.3;
  color: var(--mtl-orange-deep);
}

.mtl-leg--3 .mtl-leg__name { color: #fdba74; }

/* ---------- Product fragments float a step above the ground ---------- */

.mtl-quiz,
.mtl-ai-note,
.mtl-major__panel {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 24px 54px -44px rgba(124, 45, 18, 0.55); /* taste-skill-ignore requested depth */
}

.mtl-bank__ui {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 26px 54px -44px rgba(124, 45, 18, 0.6); /* taste-skill-ignore requested depth */
}

.mtl-exam__steps {
  position: relative;
  overflow: hidden;
  box-shadow: 0 32px 60px -46px rgba(124, 45, 18, 0.8); /* taste-skill-ignore requested depth */
}

.mtl-exam__steps::before {
  content: '';
  position: absolute;
  right: -22%;
  top: -34%;
  width: 78%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.34) 0%, rgba(234, 88, 12, 0) 70%); /* taste-skill-ignore requested glow */
  pointer-events: none;
}

.mtl-exam__step { position: relative; }

.mtl-track--deep {
  box-shadow: 0 30px 56px -42px rgba(43, 26, 17, 0.85); /* taste-skill-ignore requested depth */
}

.mtl-track:not(.mtl-track--deep) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 22px 44px -38px rgba(124, 45, 18, 0.5); /* taste-skill-ignore requested depth */
}

.mtl-cta {
  box-shadow:
    inset 0 1px 0 rgba(255, 214, 178, 0.14),
    0 40px 80px -60px rgba(43, 26, 17, 0.9); /* taste-skill-ignore requested depth */
}

/* Two field sections in a row read as one long band: the section paddings
   already separate them, this only trims the last one. */
@media (max-width: 780px) {
  .mtl-section--field::before {
    inset-inline: 12px;
    border-radius: 20px;
  }

  .mtl-leg {
    box-shadow: none;
    background: none;
    background-image: none;
  }

  .mtl-leg--1,
  .mtl-leg--2,
  .mtl-leg--3 {
    background: none;
    background-image: none;
    box-shadow: none;
  }

  .mtl-leg--3 .mtl-leg__name { color: var(--mtl-orange-deep); }
  .mtl-leg--3 .mtl-leg__title { color: var(--mtl-ink); }
  .mtl-leg--3 .mtl-leg__note { color: var(--mtl-ink-soft); }
  .mtl-leg--3 .mtl-leg__stations { color: var(--mtl-muted); }

  .mtl-leg--3 .mtl-leg__tick { background: rgba(124, 45, 18, 0.16); }
  .mtl-leg--3 .mtl-leg__tick--on { background: var(--mtl-orange); }

  .mtl-quiz,
  .mtl-ai-note,
  .mtl-major__panel,
  .mtl-bank__ui {
    box-shadow: none;
  }
}
`;

fs.writeFileSync(path, css + block, 'utf8');
console.log('appended', block.length, 'chars');
