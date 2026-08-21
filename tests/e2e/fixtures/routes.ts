import type { Page } from '@playwright/test';

export type SyntheticMediaOptions = {
  failFirstPhoto?: boolean;
  failVideo?: boolean;
};

export type SyntheticMediaRequest = {
  phase: 'metadata' | 'playback';
  requestRange?: string;
  responseStatus: 200 | 206 | 500;
  bytesSent: number;
  totalBytes: number;
  metadataLimit: number;
  completeBody: boolean;
};

export type SyntheticMediaController = {
  requests: SyntheticMediaRequest[];
  allowFullVideo: () => void;
};

/*
 * 3,984-byte TEST-ONLY VP8/WebM, SHA-256
 * 759a661c2935da1b115db0347a21dab0ea5ba2a4d48401285e19afca26dca518.
 * Generated from ten identical 160x100 Chromium JPEG screenshots containing
 * only a solid background and the text TEST-ONLY, then encoded with the
 * Playwright-bundled ffmpeg. It has no audio and contains no user/production media.
 */
const CONTROLLED_VIDEO_BYTES = Buffer.from(
  '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',
  'base64',
);
const METADATA_LIMIT = 1_024;

function svgFor(url: string) {
  const label = url.split('/').pop()?.replace('.svg', '') ?? 'synthetic';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#54201d"/>
      <rect x="24" y="24" width="592" height="352" rx="24" fill="#e7d4b5"/>
      <text x="320" y="190" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#54201d">TEST-ONLY</text>
      <text x="320" y="238" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#982e2d">${label}</text>
    </svg>
  `;
}

export async function installSyntheticMediaRoutes(
  page: Page,
  options: SyntheticMediaOptions = {},
): Promise<SyntheticMediaController> {
  const requests: SyntheticMediaRequest[] = [];
  let fullVideoAllowed = false;

  await page.route('**/__e2e_media/**', async (route) => {
    const url = route.request().url();

    if (url.endsWith('.vtt')) {
      await route.fulfill({
        contentType: 'text/vtt; charset=utf-8',
        body: 'WEBVTT\n\n00:00.000 --> 00:01.000\nTEST-ONLY 合成字幕\n',
      });
      return;
    }

    if (options.failFirstPhoto && url.endsWith('/site-02/photo-01.svg')) {
      await route.fulfill({
        status: 500,
        contentType: 'text/plain; charset=utf-8',
        body: 'TEST-ONLY synthetic photo failure',
      });
      return;
    }

    await route.fulfill({
      contentType: 'image/svg+xml; charset=utf-8',
      body: svgFor(url),
    });
  });

  await page.route('https://e2e-media.invalid/**/video.webm', async (route) => {
    const total = CONTROLLED_VIDEO_BYTES.length;
    const metadataBytes = Math.min(METADATA_LIMIT, total - 1);
    const range = route.request().headers().range;

    if (options.failVideo) {
      requests.push({
        phase: fullVideoAllowed ? 'playback' : 'metadata',
        requestRange: range,
        responseStatus: 500,
        bytesSent: 0,
        totalBytes: total,
        metadataLimit: metadataBytes,
        completeBody: false,
      });
      await route.fulfill({
        status: 500,
        contentType: 'text/plain; charset=utf-8',
        body: 'TEST-ONLY synthetic video failure',
      });
      return;
    }

    if (!fullVideoAllowed) {
      const body = CONTROLLED_VIDEO_BYTES.subarray(0, metadataBytes);
      requests.push({
        phase: 'metadata',
        requestRange: range,
        responseStatus: 206,
        bytesSent: body.length,
        totalBytes: total,
        metadataLimit: metadataBytes,
        completeBody: false,
      });
      await route.fulfill({
        status: 206,
        contentType: 'video/webm',
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes 0-${body.length - 1}/${total}`,
          'Content-Length': String(body.length),
        },
        body,
      });
      return;
    }

    requests.push({
      phase: 'playback',
      requestRange: range,
      responseStatus: 200,
      bytesSent: total,
      totalBytes: total,
      metadataLimit: metadataBytes,
      completeBody: true,
    });
    await route.fulfill({
      status: 200,
      contentType: 'video/webm',
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(total),
      },
      body: CONTROLLED_VIDEO_BYTES,
    });
  });

  return {
    requests,
    allowFullVideo: () => {
      fullVideoAllowed = true;
    },
  };
}
