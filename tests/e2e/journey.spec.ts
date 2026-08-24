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

  await page.getByRole('button', { name: TARGET_SITE }).click();
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
