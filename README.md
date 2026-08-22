# Red Footprint · Youth Heritage Journey

An interactive 3D journey through eight revolutionary heritage sites across China's Yangtze River Delta. The project combines reviewed historical content, a globe-based route, photographs, short videos, subtitles, and accessible cross-device interactions.

## Experience

- Explore eight heritage sites on an interactive 3D globe.
- Select a red star and follow an animated camera journey into the site story.
- Browse a video-first media sequence followed by curated photographs.
- Read structured sections covering visitor information, historical context, people, exhibits, legacy, and the student team's reflection.
- Track visited sites during the current browser session.
- Continue through an accessible fallback list when WebGL is unavailable.
- Use keyboard navigation, visible focus states, reduced-motion support, and responsive layouts across desktop and mobile devices.

## Featured Sites

1. Huaibei Anti-Japanese Democratic Base Memorial Hall
2. Yuhuatai Martyrs Memorial Park
3. Victory of Crossing the Yangtze River Memorial Hall
4. Shanghai Sihang Warehouse Battle Memorial
5. Memorial of the First National Congress of the Communist Party of China
6. Jiang Shangqing Martyr Historical Materials Exhibition Hall
7. Yangzhou Revolutionary Martyrs Cemetery
8. Memorial Hall of the CPC Delegation in Meiyuan New Village

The production interface retains each venue's reviewed official Chinese name.

## Technology

- React 19 and TypeScript
- Vite
- Globe.gl and Three.js
- GSAP
- Zod production-data validation
- Vitest and Testing Library
- Playwright across desktop Chromium, mobile Chromium, and mobile WebKit
- Tencent CloudBase static hosting and versioned media storage

## Local Development

Requirements: Node.js 24.x and npm.

```bash
npm ci
npm run dev
```

Vite will print the local preview address after startup.

## Quality Checks

Run individual checks when developing:

```bash
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

Run the complete release gate before producing a deployment candidate:

```bash
npm run verify:release
```

The release gate validates reviewed site content, the production media manifest, CloudBase media reconciliation, map resources, source-code quality, unit tests, the production build, and cross-device journeys.

## Content and Media

Production site records are generated from reviewed structured content. The application references 60 versioned media objects: 8 hero images, 28 selected photographs, 8 video posters, 8 short videos, and 8 WebVTT subtitle files.

Original working media, local processing output, and cloud credentials are intentionally excluded from this repository. Structured review records are included so production content remains traceable. Published media and historical content remain subject to their recorded source, review, and usage declarations; repository access does not grant permission to reuse them independently.

## Deployment

The deployment target is Tencent CloudBase static hosting. The expected pipeline uses:

- Branch: `main`
- Install command: `npm ci`
- Build command: `npm run verify:release`
- Output directory: `dist`
- Deployment path: `/`

The repository does not contain deployment secrets, a database, cloud functions, or a server container. A public site URL will be documented only after the first deployment and final QA are explicitly authorized and completed.

## Repository Scope

This repository contains only the website project and its relevant development history. Parent workspace projects, raw source media, temporary processing directories, and unrelated local files are excluded.
