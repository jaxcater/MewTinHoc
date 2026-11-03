---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### MewTinHoc
- Definition：Project/product name of the website; the public-facing brand shown in the README and package name.
- Aliases：mewtinhoc

### CamCam
- Definition：Name of the AI chatbot tutor (the cat mascot) that answers questions about the Vietnamese high-school Computer Science exam; implemented via Botpress Cloud and surfaced through the `BotpressChatBubble` component.
- Aliases：camcam ai

### đề thi Tin học THPTQG
- Definition：The national high-school graduation exam in Computer Science (Tin học) administered by the Ministry of Education and Training (Bộ GD&ĐT); the quiz content and CamCam's fallback knowledge are scoped to this exam.
- Aliases：thi THPTQG môn Tin học、đề thi Tin học quốc gia

### cấu trúc đề thi mới
- Definition：The revised exam format described by CamCam: Part I has 24 multiple-choice questions (4 options, 6.0 points); Part II has 4 True/False multi-answer questions worth 4.0 points; total 10.0 points, 50 minutes.
- Aliases：ma trận đề thi mới

### Roadmap
- Definition：Curriculum learning paths for CS and ICT tracks, shipped as JSON (`csRoadmap.json`, `ictRoadmap.json`) and rendered by the `RoadmapTab` component; exported via `scripts/exportRoadmaps.js` into `public/LoTrinhDayXich/`.
- Aliases：lo trình dạy xích、roadmap cs、roadmap ict

### Streak
- Definition：Gamification mechanic tracking consecutive study days, visualized with animated flame stages and evolution art; stored alongside user progress.
- Aliases：streak level、streak evolution
