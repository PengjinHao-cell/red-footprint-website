import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve('src/data/maps/cities/city-map-sources.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedIds = ['nanjing', 'shanghai', 'suqian', 'yangzhou'];
const errors = [];

const actualIds = manifest.cities?.map(({ id }) => id).sort() ?? [];
if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
  errors.push(`city ids: expected ${expectedIds.join(', ')}, received ${actualIds.join(', ')}`);
}

for (const city of manifest.cities ?? []) {
  const prefix = city.id ?? 'unknown-city';
  const localPath = resolve(city.localPath ?? '');
  if (!city.reviewNumber?.trim()) errors.push(`${prefix}: review number is required`);
  if (!city.sourcePageUrl?.startsWith('https://')) errors.push(`${prefix}: HTTPS source page is required`);
  if (!city.downloadUrl?.startsWith('https://')) errors.push(`${prefix}: HTTPS download URL is required`);
  if (!Array.isArray(city.controlPoints) || city.controlPoints.length < 4) {
    errors.push(`${prefix}: at least four control points are required`);
  }
  for (const [index, point] of (city.controlPoints ?? []).entries()) {
    if (point.coordinateSystem !== manifest.calibrationCoordinateSystem) {
      errors.push(`${prefix}.controlPoints[${index}]: coordinate system mismatch`);
    }
    if (!point.coordinateSourceUrl?.startsWith('https://')) {
      errors.push(`${prefix}.controlPoints[${index}]: HTTPS coordinate source is required`);
    }
    for (const value of [point.coordinates?.lat, point.coordinates?.lng, point.pixel?.x, point.pixel?.y]) {
      if (!Number.isFinite(value)) errors.push(`${prefix}.controlPoints[${index}]: finite coordinates are required`);
    }
  }
  if (!existsSync(localPath) || !statSync(localPath).isFile()) {
    errors.push(`${prefix}: map resource is missing`);
    continue;
  }
  const bytes = statSync(localPath).size;
  const digest = createHash('sha256').update(readFileSync(localPath)).digest('hex');
  if (bytes !== city.bytes) errors.push(`${prefix}: byte count mismatch`);
  if (digest !== city.sha256) errors.push(`${prefix}: SHA-256 mismatch`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('4 city maps passed: Nanjing, Shanghai, Suqian, Yangzhou');
  console.log('4 review numbers passed; 16 calibration control points passed');
}
