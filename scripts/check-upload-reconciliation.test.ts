import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildObjectReleaseManifest,
  validateUploadReconciliation,
} from './check-upload-reconciliation.mjs';

const ENVIRONMENT_ID = 'red-footprint-preview-d5322636bd';
const BUCKET = '7265-red-footprint-preview-d5322636bd-1438111688';
const CDN_BASE_URL = `https://${BUCKET}.tcb.qcloud.la`;

function mediaManifest() {
  return JSON.parse(
    readFileSync('content/media/media-manifest.json', 'utf8'),
  );
}

function completeRelease() {
  return buildObjectReleaseManifest(mediaManifest(), {
    environmentId: ENVIRONMENT_ID,
    bucket: BUCKET,
    region: 'ap-shanghai',
    releasedAt: '2026-08-22T12:00:00+08:00',
  });
}

function completeReconciliation() {
  const release = completeRelease();
  return {
    schemaVersion: 1,
    environmentId: ENVIRONMENT_ID,
    region: 'ap-shanghai',
    bucket: BUCKET,
    version: 'v1',
    cdnBaseUrl: CDN_BASE_URL,
    verifiedAt: '2026-08-22T12:30:00+08:00',
    objectCount: release.objectCount,
    totalBytes: release.totalBytes,
    operations: {
      created: release.objectCount,
      overwritten: 0,
      deleted: 0,
      permissionsModified: false,
    },
    objects: release.objects.map((object: Record<string, unknown>) => {
      const objectPath = object.objectPath as string;
      const bytes = object.bytes as number;
      const mime = object.mime as string;
      const sha256 = object.sha256 as string;
      return {
        objectPath,
        bytes,
        mime,
        sha256,
        httpsUrl: `${CDN_BASE_URL}/${objectPath}`,
        cloud: {
          exists: true,
          bytes,
          mime,
        },
        http: {
          status: 200,
          bytes,
          mime,
          sha256,
          ...(mime === 'video/mp4'
            ? {
                range: {
                  request: 'bytes=0-1023',
                  status: 206,
                  contentRange: `bytes 0-1023/${bytes}`,
                },
              }
            : {}),
          ...(mime.startsWith('text/vtt') ? { webVtt: true } : {}),
          ...(mime === 'image/webp' ? { webpSignature: true } : {}),
        },
      };
    }),
  };
}

describe('CloudBase upload reconciliation validation', () => {
  it('builds an immutable release manifest for all 77 authorized v1 objects', () => {
    const release = completeRelease();

    expect(release).toMatchObject({
      schemaVersion: 1,
      environmentId: ENVIRONMENT_ID,
      bucket: BUCKET,
      region: 'ap-shanghai',
      version: 'v1',
      objectCount: release.objects.length,
      writePolicy: {
        createOnly: true,
        overwrite: false,
        delete: false,
        modifyPermissions: false,
      },
    });
    expect(release.objects).toHaveLength(77);
    expect(new Set(release.objects.map(({ objectPath }: { objectPath: string }) => objectPath)).size).toBe(77);
  });

  it('accepts a complete exact reconciliation with HTTPS, digest, Range, image, and VTT evidence', () => {
    expect(
      validateUploadReconciliation(
        mediaManifest(),
        completeRelease(),
        completeReconciliation(),
      ),
    ).toEqual([]);
  });

  it('rejects a reconciliation missing one of the 77 objects', () => {
    const reconciliation = completeReconciliation();
    reconciliation.objects.pop();
    reconciliation.objectCount -= 1;

    expect(
      validateUploadReconciliation(
        mediaManifest(),
        completeRelease(),
        reconciliation,
      ).join('\n'),
    ).toMatch(/77|missing/i);
  });

  it('rejects a remote digest that differs from the media manifest', () => {
    const reconciliation = completeReconciliation();
    reconciliation.objects[0].sha256 = 'f'.repeat(64);

    expect(
      validateUploadReconciliation(
        mediaManifest(),
        completeRelease(),
        reconciliation,
      ).join('\n'),
    ).toMatch(/sha256/i);
  });

  it('rejects non-HTTPS object URLs', () => {
    const reconciliation = completeReconciliation();
    reconciliation.objects[0].httpsUrl = reconciliation.objects[0].httpsUrl.replace(
      'https://',
      'http://',
    );

    expect(
      validateUploadReconciliation(
        mediaManifest(),
        completeRelease(),
        reconciliation,
      ).join('\n'),
    ).toMatch(/HTTPS/i);
  });

  it('rejects placeholder domains even when the URL uses HTTPS', () => {
    const reconciliation = completeReconciliation();
    reconciliation.cdnBaseUrl = 'https://media.example.test';
    reconciliation.objects = reconciliation.objects.map((object) => ({
      ...object,
      httpsUrl: object.httpsUrl.replace(CDN_BASE_URL, reconciliation.cdnBaseUrl),
    }));

    expect(
      validateUploadReconciliation(
        mediaManifest(),
        completeRelease(),
        reconciliation,
      ).join('\n'),
    ).toMatch(/placeholder|domain/i);
  });
});
