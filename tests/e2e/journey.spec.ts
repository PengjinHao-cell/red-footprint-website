import { expect, test, type Page } from '@playwright/test';

import { installSyntheticMediaRoutes } from './fixtures/routes';

const TARGET_SITE = '雨花台烈士陵园';

async function installTestMapAdapter(page: Page) {
  await page.route('**/src/components/globe/GlobeScene.tsx', async (route) => {
    const originalResponse = await route.fetch();
    const transformedSource = await originalResponse.text();
    const reactUrl = transformedSource.match(
      /from "([^"]+\/react\.js\?v=[^"]+)"/,
    )?.[1];
    const jsxRuntimeUrl = transformedSource.match(
      /from "([^"]+\/react_jsx-dev-runtime\.js\?v=[^"]+)"/,
    )?.[1];

    if (!reactUrl || !jsxRuntimeUrl) {
      throw new Error('Unable to locate the Vite React runtime for E2E adapter');
    }

    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        import jsxRuntime from '${jsxRuntimeUrl}';
        import React from '${reactUrl}';

        const { jsxDEV } = jsxRuntime;
        const { useEffect, useRef } = React;

        export default function TestOnlyMapAdapter(props) {
          const previousDetailOpen = useRef(props.detailOpen);

          useEffect(() => {
            props.onReady?.();
          }, [props.onReady]);

          useEffect(() => {
            const wasOpen = previousDetailOpen.current;
            previousDetailOpen.current = props.detailOpen;
            if (wasOpen && !props.detailOpen) {
              const timer = setTimeout(props.onReturnComplete, 120);
              return () => clearTimeout(timer);
            }
          }, [props.detailOpen, props.onReturnComplete]);

          const select = (id) => {
            props.onSelect(id);
            setTimeout(() => props.onTravelComplete(id), 120);
          };

          return jsxDEV('section', {
            'aria-label': 'TEST-ONLY 受控地图适配器',
            children: [
              jsxDEV('strong', { children: 'TEST-ONLY · 不代表真实地图疆域验证' }),
              ...props.sites.map((site) => jsxDEV('button', {
                children: site.officialName,
                disabled: props.selectedId !== null,
                onClick: () => select(site.id),
                type: 'button',
              }, site.id, false)),
            ],
          }, undefined, true);
        }
      `,
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.clear());
  await installSyntheticMediaRoutes(page);
});

test('welcome to detail and back preserves one visited site', async ({ page }) => {
  await installTestMapAdapter(page);
  await page.goto('');

  await expect(page.getByRole('button', { name: '开启寻访' })).toBeVisible();
  await page.getByRole('button', { name: '开启寻访' }).click();

  await expect(
    page.getByRole('region', { name: 'TEST-ONLY 受控地图适配器' }),
  ).toBeVisible();
  await expect(page.getByText('已点亮 0 / 8 处红色坐标')).toBeVisible();

  await page.getByRole('button', { name: TARGET_SITE, exact: true }).click();
  await expect(page.getByRole('status')).toContainText('正在调整地图视角');
  await expect(page.getByRole('dialog', { name: TARGET_SITE })).toBeVisible();
  await expect(page.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();

  await page.getByRole('button', { name: '关闭景点详情' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('status')).toContainText('正在调整地图视角');
  await expect(page.getByRole('status')).toBeHidden();
  await expect(
    page.getByRole('region', { name: 'TEST-ONLY 受控地图适配器' }),
  ).toBeVisible();
  await expect(page.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
});

test('desktop directory shows eight cards with intact names that open detail directly', async ({
  page,
}) => {
  await installTestMapAdapter(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('');

  await page.getByRole('button', { name: '开启寻访' }).click();
  await expect(
    page.getByRole('region', { name: 'TEST-ONLY 受控地图适配器' }),
  ).toBeVisible();

  const cards = page.getByRole('button', { name: /^查看/ });
  await expect(cards).toHaveCount(8);

  const longCard = page.getByRole('button', {
    name: /查看中国共产党第一次全国代表大会纪念馆/,
  });
  await longCard.scrollIntoViewIfNeeded();
  await expect(longCard).toBeVisible();
  await expect(longCard).toContainText('中国共产党第一次全国代表大会纪念馆');
  const overflow = await longCard.evaluate((element) => {
    const title = element.querySelector('.site-directory__card-title');
    if (!title) {
      return -1;
    }
    return title.scrollWidth - title.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);

  await longCard.click();
  await expect(
    page.getByRole('dialog', { name: '中国共产党第一次全国代表大会纪念馆' }),
  ).toBeVisible();
  await expect(page.getByText('正在调整地图视角')).toHaveCount(0);
  await expect(page.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();

  await page.getByRole('button', { name: '关闭景点详情' }).click();
  await expect(
    page.getByRole('region', { name: 'TEST-ONLY 受控地图适配器' }),
  ).toBeVisible();

  const martyrCard = page.getByRole('button', { name: /查看雨花台烈士陵园/ });
  await martyrCard.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '雨花台烈士陵园' })).toBeVisible();
});

test('mobile directory stacks one column and opens detail from a tap', async ({
  page,
}) => {
  await installTestMapAdapter(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('');

  await page.getByRole('button', { name: '开启寻访' }).click();
  await expect(
    page.getByRole('region', { name: 'TEST-ONLY 受控地图适配器' }),
  ).toBeVisible();

  const cards = page.getByRole('button', { name: /^查看/ });
  await expect(cards).toHaveCount(8);

  const firstCard = cards.nth(0);
  const secondCard = cards.nth(1);
  await firstCard.scrollIntoViewIfNeeded();
  await expect(firstCard).toBeVisible();

  const firstBox = await firstCard.boundingBox();
  const secondBox = await secondCard.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(secondBox!.x).toBeCloseTo(firstBox!.x, 0);
  expect(secondBox!.y).toBeGreaterThan(firstBox!.y);

  const secondName = await secondCard
    .locator('.site-directory__card-title')
    .textContent();
  await secondCard.click();
  await expect(
    page.getByRole('dialog', { name: secondName?.trim() ?? '' }),
  ).toBeVisible();
});

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
