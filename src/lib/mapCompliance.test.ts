import { describe, expect, it } from 'vitest';

import { validateMapCompliance } from './mapCompliance';

function createIntegrityRecord() {
  return {
    status: 'integrity-checked',
    purpose: '项目内部技术与人工视觉完整性检查，不是新审图批准。',
    derivedThreeDimensionalResource: true,
    newReviewClaimed: false,
    coordinateSystem: 'GCJ-02',
    markers: Array.from({ length: 8 }, (_, index) => ({
      id: `site-${index + 1}`,
      officialName: `红色地点${index + 1}`,
      lat: 31 + index / 10,
      lng: 118 + index / 10,
    })),
    checks: {
      sourceRecord: true,
      digest: true,
      geometry: true,
      eightMarkers: true,
      fallbackList: true,
      reducedMotion: true,
    },
    humanVisualIntegrity: {
      referenceReviewNumber: 'GS(2023)2762号',
      checkedAt: '2026-08-21',
      viewports: ['390x844', '768x1024', '1366x768', '1920x1080'],
      mainlandOutline: true,
      nationalBoundaries: true,
      administrativeBoundaries: true,
      majorIslands: true,
      eightMarkers: true,
    },
  };
}

function errorText(input: unknown) {
  return validateMapCompliance(input).join('\n');
}

describe('validateMapCompliance', () => {
  it('accepts a complete technical and visual integrity record without approval fields', () => {
    const record = createIntegrityRecord();

    expect(validateMapCompliance(record)).toEqual([]);
    expect(record).not.toHaveProperty('publicUseAllowed');
    expect(record).not.toHaveProperty('verifiedBy');
    expect(record).not.toHaveProperty('signature');
  });

  it('rejects any claim that the derived 3D resource obtained a new review', () => {
    const record = { ...createIntegrityRecord(), newReviewClaimed: true };

    expect(errorText(record)).toMatch(/newReviewClaimed/);
  });

  it('requires exactly eight unique GCJ-02 markers in China coordinate bounds', () => {
    const record = createIntegrityRecord();
    record.markers[7] = { ...record.markers[0] };

    expect(errorText(record)).toMatch(/markers.*unique/i);
  });

  it('requires source, digest, geometry, fallback, and reduced-motion checks', () => {
    const record = createIntegrityRecord();
    record.checks.geometry = false;
    record.checks.fallbackList = false;

    expect(errorText(record)).toMatch(/checks\.geometry/);
    expect(errorText(record)).toMatch(/checks\.fallbackList/);
  });

  it('requires the four viewport visual comparison and all integrity categories', () => {
    const record = createIntegrityRecord();
    record.humanVisualIntegrity.viewports = ['390x844'];
    record.humanVisualIntegrity.majorIslands = false;

    expect(errorText(record)).toMatch(/humanVisualIntegrity\.viewports/);
    expect(errorText(record)).toMatch(/humanVisualIntegrity\.majorIslands/);
  });

  it('does not treat a legacy blocked approval record as the new integrity schema', () => {
    const legacyRecord = {
      status: 'blocked',
      publicUseAllowed: false,
      missingFields: ['verifiedBy', 'signature'],
    };

    expect(errorText(legacyRecord)).toMatch(/status.*integrity-checked/i);
  });
});
