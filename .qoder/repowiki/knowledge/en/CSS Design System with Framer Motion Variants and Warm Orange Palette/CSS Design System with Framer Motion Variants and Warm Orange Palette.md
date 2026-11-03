---
kind: frontend_style
name: CSS Design System with Framer Motion Variants and Warm Orange Palette
category: frontend_style
scope:
    - '**'
source_files:
    - src/index.css
    - src/variants.ts
    - src/components/announcement-banner.css
    - src/components/loading-screen.css
    - vite.config.js
    - package.json
---

## Approach

The frontend is a React + Vite SPA styled entirely in plain CSS (no Tailwind, no SCSS, no CSS-in-JS library). Visual consistency is achieved through:

1. **A single global stylesheet** `src/index.css` (~9200 lines) that defines the design tokens, base resets, layout shell, page sections, and component styles.
2. **Per-component CSS files** for complex UI pieces: `src/components/announcement-banner.css` (iOS-style notification cards), `src/components/loading-screen.css` (loading animations).
3. **Framer Motion variants** centralized in `src/variants.ts`, which acts as the motion design system — easing curves, spring configs, durations, and per-section variant sets (`headerMotionVariants`, `bannerContainerVariants`, `statCardVariants`, `pageTransitionVariants`, etc.).
4. **No external UI framework** — dependencies are only `react`, `framer-motion`, `lucide-react` (icons), `pdfjs-dist`, `react-pdf`, `react-router-dom`, `canvas-confetti`, plus Supabase/Botpress clients.

## Key Files

- `src/index.css` — global design tokens, base styles, app shell, hero banner, streak card, metrics grid, navigation dock, quiz/exam components.
- `src/variants.ts` — shared motion tokens (easings, springs, durations) and Framer Motion variant objects consumed by React components.
- `src/components/announcement-banner.css` — iOS-inspired glassmorphism announcement cards and modal overlay.
- `src/components/loading-screen.css` — loading spinner / dot-bounce / progress-bar keyframes.
- `vite.config.js` — Vite config; notably `build.cssMinify: false` keeps CSS readable in production builds.
- `package.json` — confirms no CSS preprocessor or utility framework dependency.

## Architecture & Conventions

### Design Tokens via CSS Custom Properties
All colors, fonts, shadows, radii, and transitions live in `:root` at the top of `src/index.css`:

- **Palette** — "Energy Orange" theme: deep accent `#7C2D12`, primary `#EA580C`, amber `#FBBF24`, cream `#FFF1D6`, warm canvas background `#FFFCF7`. Semantic aliases include `--color-primary-hover`, `--color-primary-light`, `--color-success`, `--color-danger`, `--color-text-main`, `--color-text-muted`, `--color-text-deep`.
- **Typography** — `--font-main` = 'Plus Jakarta Sans', 'Inter', system sans stack; `--font-code` = 'JetBrains Mono', 'Fira Code', monospace stack.
- **Shadows** — `--shadow-sm/md/lg/glow/amber-glow` all keyed to the deep orange palette.
- **Radius** — `--radius-sm/md/lg/full` (8px / 14px / 20px / 9999px).
- **Transitions** — `--transition-fast` (180ms) and `--transition-normal` (280ms) both using `cubic-bezier(0.4, 0, 0.2, 1)`.

### Component Styling Pattern
- Global base reset in `index.css`: `box-sizing: border-box`, body font/background, button defaults, anchor defaults.
- Layout uses Flexbox and CSS Grid (`.app-container`, `.home-grid`, `.knowledge-matrix-grid`, `.metrics-row`) with responsive breakpoints at 1024px, 900px, 768px, 640px.
- Components use BEM-like class names (e.g., `.hero-welcome-card`, `.streak-card`, `.nav-tab-btn`, `.metric-card`).
- Complex animated components ship their own CSS file imported alongside the component (e.g., `announcement-banner.css`, `loading-screen.css`).

### Motion System
`src/variants.ts` centralizes all Framer Motion configuration:
- **Easings**: `naturalOut`, `easeInOut`, `fastExit`, `emilOut` (mirrors CSS `--ease-out`).
- **Springs**: `gentle` (stiffness 120/damping 18), `snappy` (380/30), `pill` (380/40, critically damped so pill doesn't overshoot), `rewardPop` (260/15).
- **Durations**: micro 200ms, tabSwitch 280ms, pageEnter 550ms, countUp 900ms, ambientSlow 12s.
- Per-section variant groups: header, banner, stats row, matrix grid, streak card, buttons/cards/icons, page transitions.
- A `reducedMotionVariants` set provides simplified opacity-only transitions for `prefers-reduced-motion` users.

### Accessibility & Reduced Motion
- Announcement banner includes `@media (prefers-reduced-motion: reduce)` and `@media (prefers-reduced-transparency: reduce)` blocks that strip transforms/backdrop-filter and fall back to solid backgrounds.
- Focus-visible outlines on interactive elements (`.ann-check-input:focus-visible`, `.ann-close:focus-visible`).

### Responsive Strategy
- Pure CSS media queries (no responsive utilities): breakpoints at 1024px (sidebar stacks below content), 900px (hero lens hidden), 768px (metrics grid collapses to 2 columns), 640px (announcement stack margins shrink).
- Fluid widths via `max-width: 1400px` containers centered with `margin: 0 auto`.

### Build-time Behavior
- `vite.config.js` disables CSS minification (`cssMinify: false`), keeping the large `index.css` human-readable in production.
- No PostCSS, Sass, or CSS-in-JS pipeline — plain CSS is processed directly by Vite.

## Conventions Observed

- All visual values go through CSS custom properties under `:root`; hard-coded color literals appear only inside component-specific overrides (e.g., announcement type variants `--a`, `--a-ink`, `--t1`, `--t2`).
- Animations prefer GPU-friendly properties (`transform`, `opacity`, `will-change`) and avoid layout-triggering properties during animation.
- Framer Motion variants are defined once in `variants.ts` and referenced by components rather than inline.
- Component-scoped CSS lives next to the component in `src/components/` and is imported where needed.
- The warm orange palette is consistent across gradients, glows, borders, and active states — secondary surfaces use `--color-cream` / `--color-border-subtle` rather than neutral grays.