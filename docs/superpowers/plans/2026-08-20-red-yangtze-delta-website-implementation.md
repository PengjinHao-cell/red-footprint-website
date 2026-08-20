# “青春寻访·红色足迹”长三角专题网站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first static website that presents eight Jiangsu/Shanghai red-culture practice sites through a compliant interactive 3D globe, camera flights, photo stories, and eight one-minute videos.

**Architecture:** A React/Vite single-page application renders the globe with Globe.gl/Three.js and controls transitions with GSAP. Verified site content lives in typed local JSON, while large videos are hosted on CloudBase/COS and loaded only when a detail panel opens. The app includes an accessible list fallback when WebGL or globe assets fail.

**Tech Stack:** React 19, TypeScript, Vite, Globe.gl, Three.js, GSAP, Zod, Vitest, Testing Library, Playwright, ESLint, GitHub Actions, CloudBase or EdgeOne Pages, Tencent COS/CloudBase Storage.

---

## File map

```text
package.json                         Project scripts and dependency boundary
vite.config.ts                      Vite and Vitest configuration
playwright.config.ts                Mobile/desktop end-to-end projects
src/main.tsx                        React entry point
src/App.tsx                         Page state orchestration only
src/styles/tokens.css               Approved B-palette design tokens
src/styles/global.css               Reset, typography, reduced-motion rules
src/data/siteSchema.ts              Zod schema and exported Site type
src/data/sites.json                 Verified production content for eight sites
src/data/loadSites.ts               Parse and validate production data
src/components/welcome/             Welcome and loading UI
src/components/globe/               Globe, markers, camera controller, fallback
src/components/detail/              Hero, facts, story, gallery, video, sources
src/components/progress/            Visited-site progress
src/hooks/useJourneyProgress.ts      Session-only visited state
src/hooks/useReducedMotion.ts        OS motion preference
src/lib/media.ts                     Image/video URL and preload helpers
src/lib/mapCompliance.ts             Map attribution and review metadata checks
src/test/fixtures/sites.ts           Complete synthetic test data
tests/e2e/journey.spec.ts            Core desktop/mobile journey
tests/e2e/fallback.spec.ts           WebGL/media failure behavior
scripts/check-content.mjs            Production content and source gate
scripts/check-map-compliance.mjs     Map source/review-number release gate
.github/workflows/ci.yml             Test/build/content checks
docs/content-intake.md               Exact asset and factual-source intake format
docs/release-checklist.md             Human map/content/browser release checks
```

## Task 1: Scaffold the tested React application

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Create the dependency and script contract**

Use scripts `dev`, `build`, `test`, `test:run`, `test:e2e`, `lint`, `check:content`, and `check:map`. Pin React, Vite, TypeScript, Vitest, Testing Library, Playwright, Globe.gl, Three.js, GSAP, and Zod in `package.json`.

- [ ] **Step 2: Write the failing application smoke test**

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

it('renders the approved project title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '青春寻访·红色足迹' })).toBeVisible();
});
```

- [ ] **Step 3: Run the test and verify failure**

Run: `npm install && npm run test:run -- src/App.test.tsx`  
Expected: FAIL because the application files or heading do not exist.

- [ ] **Step 4: Implement the minimal entry and heading**

```tsx
export default function App() {
  return <h1>青春寻访·红色足迹</h1>;
}
```

- [ ] **Step 5: Verify tests and production build**

Run: `npm run test:run && npm run build`  
Expected: all tests PASS and `dist/index.html` exists.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html src
git commit -m "chore: scaffold red footprint web app"
```

## Task 2: Lock the B visual system and responsive shell

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Modify: `src/main.tsx`
- Create: `src/components/welcome/WelcomeScreen.tsx`
- Create: `src/components/welcome/WelcomeScreen.test.tsx`

- [ ] **Step 1: Write failing welcome-screen assertions**

```tsx
render(<WelcomeScreen ready={false} onEnter={() => undefined} />);
expect(screen.getByText('南京晓庄学院暑期社会实践成果展示')).toBeVisible();
expect(screen.getByRole('button', { name: '开启寻访' })).toBeDisabled();
expect(screen.getByRole('status')).toHaveTextContent('正在载入实践足迹');
```

- [ ] **Step 2: Verify the test fails**

Run: `npm run test:run -- src/components/welcome/WelcomeScreen.test.tsx`  
Expected: FAIL because `WelcomeScreen` does not exist.

- [ ] **Step 3: Implement the component and approved tokens**

Define CSS variables `--paper: #fbf7ee`, `--sand: #e7d4b5`, `--brick: #982e2d`, `--brick-dark: #54201d`, `--ink: #3f2925`, and `--focus: #c43b38`. Implement a centered welcome screen with the approved subtitle, short guide copy, loading status, and enabled enter button only when `ready` is true.

- [ ] **Step 4: Add motion and accessibility rules**

In `global.css`, keep focus outlines visible, enforce a 44px minimum touch target, and under `@media (prefers-reduced-motion: reduce)` set nonessential animation durations to `0.01ms`.

- [ ] **Step 5: Verify responsive behavior**

Run: `npm run test:run -- src/components/welcome/WelcomeScreen.test.tsx && npm run build`  
Expected: PASS; no TypeScript or CSS import errors.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/main.tsx src/components/welcome
git commit -m "feat: add youth humanities visual shell"
```

## Task 3: Define and validate the eight-site content contract

**Files:**
- Create: `src/data/siteSchema.ts`
- Create: `src/data/loadSites.ts`
- Create: `src/data/loadSites.test.ts`
- Create: `src/test/fixtures/sites.ts`
- Create: `docs/content-intake.md`

- [ ] **Step 1: Write failing schema tests**

Test that a complete eight-site fixture parses, duplicate IDs fail, a missing source URL fails, non-HTTPS video URLs fail, and any count other than eight fails.

```ts
expect(() => loadSites(validEightSites)).not.toThrow();
expect(() => loadSites(validEightSites.slice(0, 7))).toThrow(/exactly 8 sites/);
expect(() => loadSites([{ ...validEightSites[0], sources: [] }])).toThrow();
```

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/data/loadSites.test.ts`  
Expected: FAIL because the schema and loader do not exist.

- [ ] **Step 3: Implement the exact schema**

```ts
export const siteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  officialName: z.string().min(2),
  shortName: z.string().min(2),
  province: z.enum(['江苏省', '上海市']),
  city: z.string().min(2),
  district: z.string().min(2),
  address: z.string().min(5),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  opening: z.string().min(2),
  reservation: z.string().min(2),
  visitNotice: z.string().min(2),
  officialTitle: z.string().min(2),
  history: z.string().min(80),
  people: z.string().min(50),
  spirit: z.string().min(50),
  reflection: z.string().min(50),
  heroImage: z.string().min(1),
  heroFocus: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  photos: z.array(z.string().min(1)).min(3).max(5),
  video: z.object({ url: z.string().url().startsWith('https://'), poster: z.string().min(1), captions: z.string().min(1) }),
  sources: z.array(z.object({ label: z.string().min(2), url: z.string().url() })).min(1),
});
```

- [ ] **Step 4: Implement collection invariants**

`loadSites` must require exactly eight unique IDs and unique `officialName` values. It must return `ReadonlyArray<Site>` only after validation.

- [ ] **Step 5: Document the intake contract**

In `docs/content-intake.md`, list the eight supplied working names, required official-name verification, accepted authoritative sources, image naming, video naming, WebVTT captions, and the rule that no production record is merged without a source URL.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:run -- src/data/loadSites.test.ts`  
Expected: PASS.

```bash
git add src/data src/test/fixtures docs/content-intake.md
git commit -m "feat: validate eight-site content model"
```

## Task 4: Implement journey state and progress

**Files:**
- Create: `src/hooks/useJourneyProgress.ts`
- Create: `src/hooks/useJourneyProgress.test.ts`
- Create: `src/components/progress/JourneyProgress.tsx`
- Create: `src/components/progress/JourneyProgress.test.tsx`

- [ ] **Step 1: Write failing hook and UI tests**

Verify that visiting the same site twice counts once, progress starts at zero, and the label renders `已点亮 3 / 8 处红色坐标`.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/hooks/useJourneyProgress.test.ts src/components/progress/JourneyProgress.test.tsx`  
Expected: FAIL because hook and component do not exist.

- [ ] **Step 3: Implement session-only state**

Use `sessionStorage` key `red-footprint:visited:v1`. Guard all storage access for SSR/test environments and malformed stored JSON. Expose `visitedIds`, `markVisited(id)`, `isVisited(id)`, and `resetJourney()`.

- [ ] **Step 4: Implement accessible progress output**

Render visible text plus `<progress value={visitedCount} max={8}>` and an ARIA label containing the same count.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:run -- src/hooks/useJourneyProgress.test.ts src/components/progress/JourneyProgress.test.tsx`  
Expected: PASS.

```bash
git add src/hooks src/components/progress
git commit -m "feat: track eight-site journey progress"
```

## Task 5: Build the compliant globe shell and list fallback

**Files:**
- Create: `src/components/globe/GlobeScene.tsx`
- Create: `src/components/globe/GlobeScene.test.tsx`
- Create: `src/components/globe/SiteListFallback.tsx`
- Create: `src/components/globe/SiteListFallback.test.tsx`
- Create: `src/hooks/useWebGLSupport.ts`
- Create: `src/hooks/useWebGLSupport.test.ts`

- [ ] **Step 1: Write failing behavior tests**

Mock WebGL support and assert that supported devices render a canvas region while unsupported devices render eight accessible site buttons. Assert marker buttons expose the official site name and visited state.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/components/globe src/hooks/useWebGLSupport.test.ts`  
Expected: FAIL because globe components do not exist.

- [ ] **Step 3: Implement WebGL detection and fallback first**

Detect `webgl2` then `webgl`; return `false` after context creation errors. `SiteListFallback` receives `sites` and `onSelect`, renders every site, and remains the error boundary fallback for globe asset failure.

- [ ] **Step 4: Implement the Globe.gl adapter**

Keep Globe.gl imperative calls inside `GlobeScene`. Accept `sites`, `visitedIds`, `selectedId`, `onSelect`, `onReady`, and `onError`. Apply the B palette, warm atmosphere, accessible external controls, capped device pixel ratio, and eight pulsing markers.

- [ ] **Step 5: Do not add unverified boundary data**

Use a neutral approved globe texture configuration interface. The component must refuse to initialize the production boundary layer unless `mapCompliance.reviewNumber` and `mapCompliance.sourceUrl` are present; tests use a clearly synthetic non-production fixture.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:run -- src/components/globe src/hooks/useWebGLSupport.test.ts`  
Expected: PASS.

```bash
git add src/components/globe src/hooks/useWebGLSupport*
git commit -m "feat: add compliant globe shell and fallback"
```

## Task 6: Implement cancellable camera flights

**Files:**
- Create: `src/components/globe/cameraFlight.ts`
- Create: `src/components/globe/cameraFlight.test.ts`
- Create: `src/hooks/useReducedMotion.ts`
- Create: `src/hooks/useReducedMotion.test.ts`

- [ ] **Step 1: Write failing transition tests**

Use a fake camera adapter and fake timers. Assert `idle → departing → arriving → open`, ignore a second marker during flight, cancel on unmount, and use a short fade path when reduced motion is enabled.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/components/globe/cameraFlight.test.ts src/hooks/useReducedMotion.test.ts`  
Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement an explicit state machine**

Export `createCameraFlightController(adapter, options)` with methods `flyTo(site)`, `returnToOverview()`, `cancel()`, and `getState()`. Use GSAP timelines of 1.8–2.5 seconds for normal motion and no spatial flight for reduced motion.

- [ ] **Step 4: Verify race prevention**

Run: `npm run test:run -- src/components/globe/cameraFlight.test.ts`  
Expected: PASS, including the ignored second-click assertion.

- [ ] **Step 5: Commit**

```bash
git add src/components/globe/cameraFlight* src/hooks/useReducedMotion*
git commit -m "feat: add accessible globe camera flights"
```

## Task 7: Build the detail panel, hero image, gallery, and video

**Files:**
- Create: `src/components/detail/SiteDetailPanel.tsx`
- Create: `src/components/detail/SiteDetailPanel.test.tsx`
- Create: `src/components/detail/SiteHero.tsx`
- Create: `src/components/detail/PhotoGallery.tsx`
- Create: `src/components/detail/VideoPlayer.tsx`
- Create: `src/components/detail/detail.css`
- Create: `src/lib/media.ts`

- [ ] **Step 1: Write failing panel tests**

Assert the hero uses `heroImage` and `heroFocus`, official name overlays the bottom gradient, empty optional modules are absent, gallery has three to five images, video is not requested before panel open, captions use `<track kind="captions">`, and Escape closes the panel.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/components/detail/SiteDetailPanel.test.tsx`  
Expected: FAIL because detail components do not exist.

- [ ] **Step 3: Implement the responsive panel**

Use a mobile near-fullscreen bottom sheet and a desktop side panel. Trap keyboard focus while open, restore focus to the marker on close, label the dialog with the official site name, and prevent background scrolling.

- [ ] **Step 4: Implement the 4:5 hero and media loading**

Use `object-position: var(--hero-x) var(--hero-y)` from validated percentages, a brick-to-transparent gradient, lazy gallery images, explicit dimensions to prevent layout shift, and a poster-first video element with `preload="metadata"` only after the panel opens.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:run -- src/components/detail/SiteDetailPanel.test.tsx && npm run build`  
Expected: PASS.

```bash
git add src/components/detail src/lib/media.ts
git commit -m "feat: add media-rich site detail panel"
```

## Task 8: Integrate the full application state flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Create: `src/components/AppErrorBoundary.tsx`
- Create: `src/components/AppErrorBoundary.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Assert welcome → globe → select marker → travel status → detail panel → close → globe, progress changes from 0/8 to 1/8, and a thrown globe error shows the site list without losing content access.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/App.test.tsx src/components/AppErrorBoundary.test.tsx`  
Expected: FAIL because orchestration is incomplete.

- [ ] **Step 3: Implement a small page state model**

Use states `welcome`, `map`, `travelling`, and `detail`. Keep selected site ID in `App`; keep camera internals inside the globe component; mark the site visited only when its detail panel opens.

- [ ] **Step 4: Add recoverable error handling**

The error boundary must log a concise client-side error, show `SiteListFallback`, and offer “重新加载 3D 地图” without reloading the entire page.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:run && npm run build`  
Expected: all unit/integration tests PASS and the production build succeeds.

```bash
git add src/App* src/components/AppErrorBoundary*
git commit -m "feat: integrate complete red footprint journey"
```

## Task 9: Add content and map compliance release gates

**Files:**
- Create: `src/data/mapCompliance.json`
- Create: `src/lib/mapCompliance.ts`
- Create: `src/lib/mapCompliance.test.ts`
- Create: `scripts/check-content.mjs`
- Create: `scripts/check-map-compliance.mjs`
- Create: `docs/release-checklist.md`

- [ ] **Step 1: Write failing compliance tests**

Assert that blank source URLs, blank review numbers, non-authoritative map provenance, fewer/more than eight sites, missing factual sources, missing captions, and duplicate official names all fail the release check.

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/lib/mapCompliance.test.ts && npm run check:content && npm run check:map`  
Expected: FAIL until verified production metadata and content are installed.

- [ ] **Step 3: Implement deterministic release scripts**

`check-content.mjs` imports the built schema, verifies eight complete records, verifies every local asset exists, and rejects HTTP video/source URLs. `check-map-compliance.mjs` requires source name, source URL, review number, license/use note, verification date, and reviewer name.

- [ ] **Step 4: Write the human release checklist**

Include official-name checks, address and opening-information checks, source capture, China territory completeness, administrative-boundary comparison, visible map attribution/review number, eight marker coordinates, image crop review, eight captioned videos, WeChat/Safari/Chrome playback, weak-network fallback, and ICP/footer review.

- [ ] **Step 5: Install verified production inputs**

Populate `sites.json` only from the delivered source pack and authoritative references. Populate `mapCompliance.json` only after selecting the approved standard map or licensed reviewed service. Never bypass a failing compliance script with a hard-coded success value.

- [ ] **Step 6: Verify and commit**

Run: `npm run check:content && npm run check:map && npm run test:run && npm run build`  
Expected: all commands PASS before any public deployment.

```bash
git add src/data src/lib/mapCompliance* scripts docs/release-checklist.md
git commit -m "chore: enforce content and map compliance gates"
```

## Task 10: Add mobile/desktop end-to-end coverage

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/journey.spec.ts`
- Create: `tests/e2e/fallback.spec.ts`

- [ ] **Step 1: Configure three browser projects**

Add Chromium desktop, Pixel-class mobile Chromium, and iPhone-class WebKit projects. Start the built preview server on a fixed local port.

- [ ] **Step 2: Write the failing core journey test**

```ts
test('visits one of eight sites and returns to the map', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: /雨花台烈士陵园/ }).click();
  await expect(page.getByRole('dialog', { name: /雨花台烈士陵园/ })).toBeVisible();
  await expect(page.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
  await page.getByRole('button', { name: '关闭景点详情' }).click();
  await expect(page.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
});
```

- [ ] **Step 3: Write fallback and media tests**

Block the globe texture request and assert the eight-site list appears. Open a detail panel, verify no video request occurs before play, then click play and verify the configured video URL is requested.

- [ ] **Step 4: Run and fix until all projects pass**

Run: `npx playwright install chromium webkit && npm run test:e2e`  
Expected: PASS in desktop Chromium, mobile Chromium, and mobile WebKit.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e
git commit -m "test: cover desktop and mobile journeys"
```

## Task 11: Add CI and static deployment configuration

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `cloudbaserc.json`
- Create: `edgeone.json`
- Modify: `README.md`

- [ ] **Step 1: Create CI with release gates**

On pull requests and pushes to `main`, run dependency installation, lint, unit tests, content check, map check, production build, and Playwright tests. Upload Playwright HTML reports only on failure.

- [ ] **Step 2: Configure static hosting behavior**

Set output directory to `dist`, SPA fallback to `/index.html`, long immutable caching for hashed assets, short caching for `index.html` and `sites.json`, HTTPS-only access, and no server/database resources.

- [ ] **Step 3: Document deployment responsibilities**

README must explain GitHub automatic builds, CloudBase/EdgeOne selection, COS video upload, environment-specific public video base URL, custom domain/ICP requirement for mainland production, rollback to a prior deployment, and prohibition on deploying when compliance checks fail.

- [ ] **Step 4: Verify the same pipeline locally**

Run: `npm run lint && npm run test:run && npm run check:content && npm run check:map && npm run build && npm run test:e2e`  
Expected: every command PASS.

- [ ] **Step 5: Commit**

```bash
git add .github cloudbaserc.json edgeone.json README.md
git commit -m "ci: add verified static deployment pipeline"
```

## Task 12: Perform visual, browser, and release QA

**Files:**
- Modify: `docs/release-checklist.md`
- Create: `docs/qa-report.md`

- [ ] **Step 1: Test representative physical viewports**

Review 390×844 mobile, 768×1024 tablet, 1366×768 laptop, and 1920×1080 presentation layouts. Record pass/fail for welcome, globe, each marker, every hero crop, gallery, video, sources, progress, and fallback.

- [ ] **Step 2: Run the eight-site content audit**

Open every site in display order and compare the website against its source pack. Record the source used for each official name, address, historical date, person, and opening rule.

- [ ] **Step 3: Run the map compliance audit**

Compare the final globe/map rendering with the approved source, confirm the China territory representation is complete where shown, confirm no custom boundary alteration, confirm attribution and review number visibility, and obtain project-owner sign-off before public release.

- [ ] **Step 4: Test media and weak-network behavior**

Verify all eight MP4 files, WebVTT captions, posters, `faststart`, mobile portrait display, retry UI, lazy loading, and fallback under Fast 3G throttling.

- [ ] **Step 5: Record the final evidence**

In `docs/qa-report.md`, record tested commit SHA, date, browsers/devices, automated command results, eight-site audit outcome, map sign-off, known limitations, production URL, and rollback deployment identifier.

- [ ] **Step 6: Final commit**

```bash
git add docs/release-checklist.md docs/qa-report.md
git commit -m "docs: record release verification evidence"
```

## Plan self-review result

- Spec coverage: welcome, B visual system, eight sites, globe, flights, hero photos, gallery, video, progress, fallback, map compliance, deployment, content intake, mobile/desktop testing, and release QA are mapped to tasks.
- Placeholder scan: the plan contains no implementation placeholders; production content installation is an explicit source-gated task.
- Type consistency: `Site`, `sites.json`, `mapCompliance.json`, progress count 8, component names, and test selectors are consistent across tasks.
