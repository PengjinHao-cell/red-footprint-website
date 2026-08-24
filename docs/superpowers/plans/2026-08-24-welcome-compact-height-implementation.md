# 开屏低高度桌面适配 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 1280×720、1366×768 和 1440×900 桌面视口完整显示开屏标题、路线动画和入口按钮，同时保持手机视觉不变。

**Architecture:** 在 `global.css` 末尾增加一个只命中宽度至少 48rem 且高度不超过 900px 的紧凑开屏媒体查询。Playwright 直接量取实际 DOM 边界，防止以后再次把主要入口挤出首屏；验收记录只更正可由 Git 历史验证的提交信息和新增视口证据。

**Tech Stack:** React 19、Vite、CSS 媒体查询、Playwright、Vitest、ESLint。

---

### Task 1: 为低高度桌面开屏建立真实 RED 测试

**Files:**
- Modify: `tests/e2e/journey.spec.ts`

- [ ] **Step 1: 增加桌面首屏边界测试**

在 `mobile directory stacks one column and opens detail from a tap` 测试之后加入以下测试：

```ts
test('compact desktop welcome keeps the route and entry button in view', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'Desktop Chromium',
    'This boundary measurement is for desktop layout only.',
  );

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForTimeout(800);

    const measurements = await page.evaluate(() => {
      const getBounds = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) {
          throw new Error(`Missing ${selector}`);
        }
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      };

      const title = getBounds('.welcome-screen__title');
      return {
        height: window.innerHeight,
        title,
        subtitle: getBounds('.welcome-screen__subtitle'),
        guide: getBounds('.welcome-screen__guide'),
        route: getBounds('.welcome-route'),
        button: getBounds('.welcome-screen__button'),
      };
    });

    for (const bounds of [
      measurements.subtitle,
      measurements.title,
      measurements.guide,
      measurements.route,
      measurements.button,
    ]) {
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(measurements.height);
    }
    expect(
      (measurements.title.top + measurements.title.bottom) /
        2 /
        measurements.height,
    ).toBeGreaterThanOrEqual(0.43);
    expect(
      (measurements.title.top + measurements.title.bottom) /
        2 /
        measurements.height,
    ).toBeLessThanOrEqual(0.48);
    expect(measurements.button.height).toBeGreaterThanOrEqual(48);
  }
});
```

- [ ] **Step 2: 运行目标测试并确认 RED**

Run: `npx playwright test tests/e2e/journey.spec.ts --project="Desktop Chromium" --grep "compact desktop welcome"`

Expected: 失败于 1280×720 或 1366×768 的路线/按钮 `bottom <= height` 断言，证明测试捕获的是当前首屏溢出。

### Task 2: 实现低高度桌面紧凑布局并确认 GREEN

**Files:**
- Modify: `src/styles/global.css`
- Test: `tests/e2e/journey.spec.ts`

- [ ] **Step 1: 在窄屏媒体查询之后加入紧凑桌面规则**

```css
@media (min-width: 48rem) and (max-height: 56.25rem) {
  .welcome-screen {
    padding-block: clamp(1rem, 3svh, 2rem);
  }

  .welcome-screen__content {
    padding-top: clamp(5.5rem, 15.5svh, 8.75rem);
  }

  .welcome-screen__guide {
    margin-top: 0.75rem;
  }

  .welcome-route {
    width: min(44vw, 15rem);
    margin-top: 0.75rem;
  }

  .welcome-screen__button {
    margin-top: 0.75rem;
  }
}
```

保留现有横向内边距、标题字号、4 段线、5 颗星、动画延迟与 48px 按钮高度。

- [ ] **Step 2: 重跑目标测试并确认 GREEN**

Run: `npx playwright test tests/e2e/journey.spec.ts --project="Desktop Chromium" --grep "compact desktop welcome"`

Expected: 1 passed；1280×720、1366×768 和 1440×900 的所有开屏元素均在首屏内，标题中心在 43%–48%，按钮高度至少 48px。

- [ ] **Step 3: 提交测试和 CSS 修复**

```bash
git add 暑期网站/tests/e2e/journey.spec.ts 暑期网站/src/styles/global.css
git diff --cached --check
git diff --cached --name-only
git commit -m "fix: keep welcome entry visible on compact desktops"
```

Expected staged paths: only the Playwright test and `global.css`.

### Task 3: 更正验收记录

**Files:**
- Modify: `docs/maintenance/2026-08-24-round-2-acceptance.md`

- [ ] **Step 1: 修正提交清单与开屏视口证据**

将第 11–19 行改为：

```md
对应基线 `fb18e40`（父仓库 main），截至本验收记录提交前共有 6 个功能/测试提交 + 1 个验收修正提交：

1. `6251f95 fix: align globe marker interaction`
2. `6b4d861 fix: prevent accidental globe marker taps`
3. `75df6b1 feat: restore sequential welcome route`
4. `4bb1926 feat: add staged globe loading progress`
5. `e04da0a feat: add responsive site directory`
6. `068ef20 test: cover refined globe interactions`
7. `e5628e6 fix: center welcome title in the approved visual band`

本文档本身对应后续提交 `e687fc0 docs: record round-2 maintenance acceptance`。
```

在“视口与人工验收说明”中加入一条：

```md
- 开屏紧凑桌面回归：1280×720、1366×768、1440×900 下副标题、主标题、导语、路线和入口按钮均在首屏，标题中心为 43%–48%，按钮高度至少 48px。
```

- [ ] **Step 2: 提交验收记录修正**

```bash
git add 暑期网站/docs/maintenance/2026-08-24-round-2-acceptance.md
git diff --cached --check
git diff --cached --name-only
git commit -m "docs: correct round-2 acceptance record"
```

Expected staged path: only the acceptance record.

### Task 4: 完整验证与独立视觉测量

**Files:**
- Verify: `tests/e2e/journey.spec.ts`
- Verify: `src/styles/global.css`
- Verify: `docs/maintenance/2026-08-24-round-2-acceptance.md`

- [ ] **Step 1: 运行全量跨浏览器 E2E**

Run: `npm run test:e2e`

Expected: 所有既有测试和新增桌面测试通过；Pixel Mobile Chromium 与 iPhone Mobile WebKit 的原有路径保持通过。

- [ ] **Step 2: 运行发布门禁**

Run: `npm run verify:release`

Expected: 8 个步骤全部通过，包含 lint、单测、构建、地图和 77 个对象对账。

- [ ] **Step 3: 用真实 Chromium 复测布局**

启动本地 Vite 服务后，使用桌面 Chromium 逐项测量 1280×720、1366×768、1440×900；记录标题中心、路线边界和按钮边界。再测量 390×844，确认媒体查询未命中手机布局。

Expected: 三个桌面视口均满足首屏边界和标题中心阈值；390×844 仍完整且无水平溢出。

- [ ] **Step 4: 检查最终工作区和远程边界**

```bash
git status --short
git log --oneline -3
git ls-remote red-footprint refs/heads/main
```

Expected: 只存在本次两个本地提交；远程 `main` 未变化。本计划不执行 subtree 导出、推送或部署。
