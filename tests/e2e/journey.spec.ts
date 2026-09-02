import { expect, test } from '@playwright/test';

import { installSyntheticMediaRoutes } from './fixtures/routes';

const TARGET_SITE = '雨花台烈士陵园';
const MOBILE_SITE = '中国共产党代表团梅园新村纪念馆';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.clear());
  await installSyntheticMediaRoutes(page);
});

test('desktop completes the two-level map journey and returns to Nanjing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop Chromium', 'Desktop journey only');
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await expect(page.getByRole('region', { name: '选择城市' })).toBeVisible();

  await page.getByRole('button', { name: '进入南京市' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
  await expect(page.getByRole('button', { name: TARGET_SITE, exact: true })).toBeVisible();
  await page.getByRole('button', { name: TARGET_SITE, exact: true }).click();
  await expect(page.getByRole('dialog', { name: TARGET_SITE })).toBeVisible();
  await expect(page.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();

  await page.getByRole('button', { name: '关闭景点详情' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('three Nanjing labels open their own matching details', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: '进入南京市' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();

  const labels = [
    ['雨花台烈士陵园', '雨花台烈士陵园'],
    ['渡江胜利纪念馆', '渡江胜利纪念馆'],
    ['中国共产党代表团梅园新村纪念馆', '中国共产党代表团梅园新村纪念馆'],
  ] as const;

  for (const [label, dialogName] of labels) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('dialog', { name: dialogName })).toBeVisible();
    await page.getByRole('button', { name: '关闭景点详情' }).click();
    await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
  }
});

test('three Nanjing stars open their own details on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'Desktop Chromium', 'Mobile overlap only');
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: '进入南京市' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();

  const stars = [
    ['定位并查看雨花台烈士陵园', '雨花台烈士陵园'],
    ['定位并查看渡江胜利纪念馆', '渡江胜利纪念馆'],
    ['定位并查看中国共产党代表团梅园新村纪念馆', '中国共产党代表团梅园新村纪念馆'],
  ] as const;

  for (const [starName, dialogName] of stars) {
    const star = page.getByRole('button', { name: starName });
    await expect(star).toBeEnabled();
    const box = await star.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.getByRole('dialog', { name: dialogName })).toBeVisible();
    await page.getByRole('button', { name: '关闭景点详情' }).click();
    await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
  }
});

test('city map zoom controls zoom in, out, and reset', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: '进入南京市' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();

  const viewport = page.getByTestId('city-map-viewport');
  await expect(viewport).toHaveAttribute('data-scale', '1');

  await page.getByRole('button', { name: '放大地图' }).click();
  await expect.poll(() => viewport.getAttribute('data-scale')).not.toBe('1');

  await page.getByRole('button', { name: '复位地图' }).click();
  await expect(viewport).toHaveAttribute('data-scale', '1');

  await page.getByRole('button', { name: '缩小地图' }).click();
  await expect(viewport).toHaveAttribute('data-scale', '1');
});

test('city star hit target stays about 44px under zoom', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop Chromium', 'Desktop hit-size only');
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: '进入南京市' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();

  const hit = page.getByRole('button', { name: '定位并查看雨花台烈士陵园' });
  const before = await hit.boundingBox();
  expect(before).not.toBeNull();
  expect(before!.width).toBeGreaterThanOrEqual(44);
  expect(before!.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: '放大地图' }).click();
  await expect
    .poll(() => page.getByTestId('city-map-viewport').getAttribute('data-scale'))
    .not.toBe('1');

  const after = await hit.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.width).toBeGreaterThanOrEqual(44);
  expect(after!.width).toBeLessThanOrEqual(46);
  expect(after!.height).toBeGreaterThanOrEqual(44);
  expect(after!.height).toBeLessThanOrEqual(46);
});

test('directory detail closes directly to a usable national map', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: /查看上海四行仓库抗战纪念馆/ }).click();
  await expect(page.getByRole('dialog', { name: '上海四行仓库抗战纪念馆' })).toBeVisible();
  await page.getByRole('button', { name: '关闭景点详情' }).click();

  await expect(page.getByRole('region', { name: '选择城市' })).toBeVisible();
  await expect(page.getByRole('button', { name: '进入南京市' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '进入上海市' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '进入扬州市' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '进入宿迁市' })).toBeEnabled();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('mobile map has 44px targets and no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'Desktop Chromium', 'Mobile project only');
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: '进入南京市' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();

  const star = page.getByRole('button', { name: `定位并查看${TARGET_SITE}` });
  const box = await star.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
});

test('reduced motion enters detail and returns without spatial waiting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await page.getByRole('button', { name: '开启寻访' }).click();
  await page.getByRole('button', { name: '进入南京市' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
  await page.getByRole('button', { name: MOBILE_SITE, exact: true }).click();
  await expect(page.getByRole('dialog', { name: MOBILE_SITE })).toBeVisible();
  await page.getByRole('button', { name: '关闭景点详情' }).click();
  await expect(page.getByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
});

test('compact desktop welcome keeps the route and entry button in view', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop Chromium', 'Desktop layout only');
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const button = page.getByRole('button', { name: '开启寻访' });
    await expect(button).toBeInViewport();
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
  }
});
