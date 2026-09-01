import { expect, test, type Page, type TestInfo } from '@playwright/test';

import {
  installSyntheticMediaRoutes,
  type SyntheticMediaController,
  type SyntheticMediaOptions,
} from './fixtures/routes';

const TARGET_SITE = '雨花台烈士陵园';

async function openDirectoryDetail(
  page: Page,
  options: SyntheticMediaOptions = {},
): Promise<SyntheticMediaController> {
  await page.addInitScript(() => window.sessionStorage.clear());
  const media = await installSyntheticMediaRoutes(page, options);
  await page.goto('');

  await expect(page.getByRole('complementary', { name: 'TEST-ONLY 标识' })).toBeVisible();
  await page.getByRole('button', { name: '开启寻访' }).click();

  await expect(page.getByRole('region', { name: '选择城市' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`查看${TARGET_SITE}`) }).click();
  await expect(page.getByRole('dialog', { name: TARGET_SITE })).toBeVisible();
  return media;
}

async function swipe(
  page: Page,
  startX: number,
  endX: number,
) {
  const carousel = page.getByRole('region', { name: '景点媒体' });
  await carousel.dispatchEvent('pointerdown', {
    clientX: startX,
    clientY: 160,
    pointerId: 1,
    pointerType: 'touch',
  });
  await carousel.dispatchEvent('pointerup', {
    clientX: endX,
    clientY: 164,
    pointerId: 1,
    pointerType: 'touch',
  });
}

function isMobileProject(testInfo: TestInfo) {
  return testInfo.project.name !== 'Desktop Chromium';
}

test('directory exposes eight native buttons and Escape keeps detail accessible', async ({
  page,
}) => {
  await openDirectoryDetail(page);

  await expect(page.getByText('TEST-ONLY 合成开放信息，不用于参观')).toBeVisible();
  await expect(page.getByRole('heading', { name: '历史印记' })).toBeVisible();
  await expect(page.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '选择城市' })).toBeVisible();
});

test('media starts with video and device navigation stops at the last photo', async ({
  page,
}, testInfo) => {
  await openDirectoryDetail(page);

  const previous = page.getByRole('button', { name: '上一项媒体' });
  const next = page.getByRole('button', { name: '下一项媒体' });
  const carousel = page.getByRole('region', { name: '景点媒体' });
  await expect(page.getByText('视频 · 1 / 3')).toBeVisible();
  await expect(previous).toBeDisabled();

  if (isMobileProject(testInfo)) {
    await swipe(page, 300, 220);
    await expect(page.getByText('照片 · 2 / 3')).toBeVisible();
    await swipe(page, 300, 220);
    await expect(page.getByText('照片 · 3 / 3')).toBeVisible();
    await swipe(page, 300, 220);
    await expect(page.getByText('照片 · 3 / 3')).toBeVisible();
    await expect(next).toBeDisabled();
    await swipe(page, 180, 250);
    await expect(page.getByText('照片 · 2 / 3')).toBeVisible();
  } else {
    await next.click();
    await expect(page.getByText('照片 · 2 / 3')).toBeVisible();
    await carousel.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('照片 · 3 / 3')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('照片 · 3 / 3')).toBeVisible();
    await expect(next).toBeDisabled();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('照片 · 2 / 3')).toBeVisible();
  }
});

test('native video focus keeps Space while playback locks every carousel input', async ({
  page,
}, testInfo) => {
  await openDirectoryDetail(page);

  const video = page.getByLabel('景点讲解视频');
  const carousel = page.getByRole('region', { name: '景点媒体' });
  const next = page.getByRole('button', { name: '下一项媒体' });

  await video.evaluate((element) => {
    element.addEventListener(
      'keydown',
      (event) => {
        element.dataset.spacePrevented = String(event.defaultPrevented);
      },
      { once: true },
    );
  });
  await video.focus();
  await page.keyboard.press('Space');
  await expect(video).toHaveAttribute('data-space-prevented', 'false');
  await expect(page.getByText('视频 · 1 / 3')).toBeVisible();

  await video.dispatchEvent('play');
  await expect(next).toBeDisabled();
  await carousel.focus();
  await page.keyboard.press('ArrowRight');
  await swipe(page, 300, 220);
  await expect(page.getByText('视频 · 1 / 3')).toBeVisible();

  await video.dispatchEvent('pause');
  await expect(next).toBeEnabled();
  await next.click();
  await page.getByRole('button', { name: '上一项媒体' }).click();
  const reloadedVideo = page.getByLabel('景点讲解视频');
  await reloadedVideo.dispatchEvent('play');
  await reloadedVideo.evaluate((element) => {
    element.dispatchEvent(new Event('error'));
  });
  await expect(next).toBeEnabled();

  const close = page.getByRole('button', { name: '关闭景点详情' });
  if (isMobileProject(testInfo)) {
    await close.tap();
  } else {
    await close.click();
  }
  await expect(page.getByLabel('景点讲解视频')).toHaveCount(0);
});

test('metadata requests stay partial until playback is explicitly allowed', async ({
  page,
}) => {
  const media = await openDirectoryDetail(page);
  const video = page.getByLabel('景点讲解视频');

  await page.waitForTimeout(150);
  const metadataRequests = media.requests.filter(
    (request) => request.phase === 'metadata',
  );
  expect(metadataRequests.every((request) => !request.completeBody)).toBe(true);
  expect(
    metadataRequests.every(
      (request) =>
        request.responseStatus === 206 &&
        request.bytesSent <= request.metadataLimit &&
        request.bytesSent < request.totalBytes,
    ),
  ).toBe(true);

  await video.click({ position: { x: 80, y: 50 } });
  media.allowFullVideo();
  await video.evaluate(async (element) => {
    element.load();
    await element.play().catch(() => undefined);
  });

  await expect.poll(() => media.requests.some((request) => request.completeBody)).toBe(true);
  expect(
    media.requests.some(
      (request) => request.phase === 'playback' && request.bytesSent > request.metadataLimit,
    ),
  ).toBe(true);
  await video.evaluate((element) => element.pause());
});

test('controlled image and video failures preserve narrative access', async ({
  page,
}) => {
  await openDirectoryDetail(page, { failFirstPhoto: true, failVideo: true });

  const video = page.getByLabel('景点讲解视频');
  await video.evaluate((element) => {
    element.dispatchEvent(new Event('error'));
  });
  await expect(page.getByRole('alert')).toContainText('视频加载失败');
  await page.getByRole('button', { name: '下一项媒体' }).click();

  await expect(
    page.getByRole('img', { name: '照片加载失败：TEST-ONLY 合成照片 02-1' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '寻访感悟' })).toBeVisible();
  await expect(page.getByText(/TEST-ONLY 合成地点 02 的寻访感悟测试段落/)).toBeVisible();
});
