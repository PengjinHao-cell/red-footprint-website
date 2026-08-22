import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_VIEWPORTS = [
  '390x844',
  '768x1024',
  '1366x768',
  '1920x1080',
];

const REQUIRED_ADMIN_CODES = [
  '110000',
  '120000',
  '130000',
  '140000',
  '150000',
  '210000',
  '220000',
  '230000',
  '310000',
  '320000',
  '330000',
  '340000',
  '350000',
  '360000',
  '370000',
  '410000',
  '420000',
  '430000',
  '440000',
  '450000',
  '460000',
  '500000',
  '510000',
  '520000',
  '530000',
  '540000',
  '610000',
  '620000',
  '630000',
  '640000',
  '650000',
  '710000',
  '810000',
  '820000',
];

const sha256Pattern = /^[a-f0-9]{64}$/i;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function parseJson(path, errors, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${label}: cannot parse JSON (${error.message})`);
    return undefined;
  }
}

function resolveInsideRoot(root, pathValue, field, errors) {
  if (typeof pathValue !== 'string' || pathValue.trim() === '') {
    errors.push(`${field}: path is required`);
    return undefined;
  }

  const candidate = isAbsolute(pathValue)
    ? resolve(pathValue)
    : resolve(root, pathValue);
  const relativePath = relative(root, candidate);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    errors.push(`${field}: must stay inside the configured root`);
    return undefined;
  }
  return candidate;
}

function requireFile(path, field, errors) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    errors.push(`${field}: file is missing (${path})`);
    return false;
  }
  return true;
}

function validateSourceRecord(source, root, errors) {
  if (!isRecord(source)) {
    errors.push('mapSource: must be a JSON object');
    return undefined;
  }

  if (source.derivedThreeDimensionalResource !== true) {
    errors.push('mapSource.derivedThreeDimensionalResource: must be true');
  }
  if (source.newReviewClaimed !== false) {
    errors.push('mapSource.newReviewClaimed: must remain false');
  }
  if (!isRecord(source.officialReference)) {
    errors.push('mapSource.officialReference: is required');
  } else {
    const official = source.officialReference;
    if (official.reviewNumber !== 'GS(2023)2762号') {
      errors.push(
        'mapSource.officialReference.reviewNumber: must be GS(2023)2762号',
      );
    }
    if (official.publisher !== '自然资源部') {
      errors.push('mapSource.officialReference.publisher: must identify 自然资源部');
    }
    if (
      typeof official.sourceUrl !== 'string' ||
      !official.sourceUrl.startsWith('https://')
    ) {
      errors.push('mapSource.officialReference.sourceUrl: HTTPS source is required');
    }
    if (!sha256Pattern.test(official.sha256 ?? '')) {
      errors.push('mapSource.officialReference.sha256: SHA-256 is required');
    }

    const officialPath = resolveInsideRoot(
      root,
      official.path,
      'mapSource.officialReference.path',
      errors,
    );
    if (officialPath && existsSync(officialPath)) {
      if (!statSync(officialPath).isFile()) {
        errors.push('mapSource.officialReference.path: must be a file');
      } else if (sha256(officialPath) !== official.sha256) {
        errors.push('mapSource.officialReference.sha256: digest mismatch');
      }
    }
  }

  if (!isRecord(source.runtimeResource)) {
    errors.push('mapSource.runtimeResource: is required');
    return undefined;
  }
  if (source.runtimeResource.format !== 'GeoJSON') {
    errors.push('mapSource.runtimeResource.format: must be GeoJSON');
  }
  if (!sha256Pattern.test(source.runtimeResource.sha256 ?? '')) {
    errors.push('mapSource.runtimeResource.sha256: SHA-256 is required');
  }
  if (!isRecord(source.runtimeResource.geometrySource)) {
    errors.push('mapSource.runtimeResource.geometrySource: provenance is required');
  } else if (
    typeof source.runtimeResource.geometrySource.url !== 'string' ||
    !source.runtimeResource.geometrySource.url.startsWith('https://')
  ) {
    errors.push('mapSource.runtimeResource.geometrySource.url: HTTPS provenance is required');
  }
  if (
    typeof source.runtimeResource.generation !== 'string' ||
    !/标题|图例/.test(source.runtimeResource.generation) ||
    !/空白/.test(source.runtimeResource.generation)
  ) {
    errors.push(
      'mapSource.runtimeResource.generation: must explain removal of title, legend, and blank canvas',
    );
  }

  return source.runtimeResource;
}

function isPosition(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  );
}

function validateCoordinateTree(value, path, errors, counters) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path}: coordinate array must not be empty`);
    return;
  }

  if (value.every(isPosition)) {
    counters.rings += 1;
    counters.positions += value.length;
    if (value.length < 4) {
      errors.push(`${path}: polygon ring needs at least four positions`);
    }
    const first = value[0];
    const last = value.at(-1);
    if (first[0] !== last[0] || first[1] !== last[1]) {
      errors.push(`${path}: polygon ring must be closed`);
    }
    value.forEach(([lng, lat], index) => {
      if (lng < 70 || lng > 140 || lat < 0 || lat > 60) {
        errors.push(`${path}[${index}]: coordinate is outside China resource bounds`);
      }
    });
    return;
  }

  value.forEach((child, index) =>
    validateCoordinateTree(child, `${path}[${index}]`, errors, counters),
  );
}

function validateGeometry(resource, errors) {
  if (!isRecord(resource) || resource.type !== 'FeatureCollection') {
    errors.push('runtimeResource: must be a GeoJSON FeatureCollection');
    return;
  }
  if (resource.derivedThreeDimensionalResource !== true) {
    errors.push('runtimeResource.derivedThreeDimensionalResource: must be true');
  }
  if (resource.newReviewClaimed !== false) {
    errors.push('runtimeResource.newReviewClaimed: must remain false');
  }
  ['image', 'texture', 'title', 'legend', 'canvas'].forEach((field) => {
    if (field in resource) {
      errors.push(`runtimeResource.${field}: whole-map page artifacts are forbidden`);
    }
  });

  if (!Array.isArray(resource.features)) {
    errors.push('runtimeResource.features: is required');
    return;
  }

  const provinces = resource.features.filter(
    (feature) => feature?.properties?.kind === 'province',
  );
  const maritime = resource.features.filter(
    (feature) => feature?.properties?.kind === 'maritime-boundary',
  );
  if (provinces.length !== 34) {
    errors.push(`runtimeResource.features: expected 34 province features, got ${provinces.length}`);
  }
  if (maritime.length !== 1) {
    errors.push(`runtimeResource.features: expected 1 maritime-boundary feature, got ${maritime.length}`);
  }

  const adminCodes = new Set(
    provinces.map((feature) => String(feature?.properties?.adcode)),
  );
  REQUIRED_ADMIN_CODES.forEach((code) => {
    if (!adminCodes.has(code)) {
      errors.push(`runtimeResource.features: missing administrative code ${code}`);
    }
  });

  const counters = { positions: 0, rings: 0 };
  resource.features.forEach((feature, index) => {
    const prefix = `runtimeResource.features[${index}]`;
    if (!isRecord(feature) || feature.type !== 'Feature') {
      errors.push(`${prefix}: must be a GeoJSON Feature`);
      return;
    }
    if (!isRecord(feature.properties)) {
      errors.push(`${prefix}.properties: is required`);
    }
    if (
      !isRecord(feature.geometry) ||
      (feature.geometry.type !== 'Polygon' &&
        feature.geometry.type !== 'MultiPolygon')
    ) {
      errors.push(`${prefix}.geometry: must be Polygon or MultiPolygon`);
      return;
    }
    validateCoordinateTree(
      feature.geometry.coordinates,
      `${prefix}.geometry.coordinates`,
      errors,
      counters,
    );
  });

  if (counters.rings < 35 || counters.positions < 1_000) {
    errors.push('runtimeResource.geometry: insufficient polygon detail');
  }
}

function validateCompliance(record, errors) {
  if (!isRecord(record)) {
    errors.push('mapCompliance: must be a JSON object');
    return;
  }
  if (record.status !== 'integrity-checked') {
    errors.push('mapCompliance.status: must be integrity-checked');
  }
  if (record.newReviewClaimed !== false) {
    errors.push('mapCompliance.newReviewClaimed: must remain false');
  }
  if (record.coordinateSystem !== 'GCJ-02') {
    errors.push('mapCompliance.coordinateSystem: must be GCJ-02');
  }
  ['publicUseAllowed', 'verifiedBy', 'signature', 'newReviewNumber'].forEach(
    (field) => {
      if (field in record) {
        errors.push(`mapCompliance.${field}: legacy approval field must be removed`);
      }
    },
  );

  if (!Array.isArray(record.markers) || record.markers.length !== 8) {
    errors.push('mapCompliance.markers: exactly 8 markers are required');
  } else {
    const ids = new Set();
    const coordinates = new Set();
    record.markers.forEach((marker, index) => {
      if (!isRecord(marker)) {
        errors.push(`mapCompliance.markers[${index}]: must be an object`);
        return;
      }
      if (typeof marker.id !== 'string' || ids.has(marker.id)) {
        errors.push('mapCompliance.markers: IDs must be unique');
      }
      ids.add(marker.id);
      const key = `${marker.lat},${marker.lng}`;
      if (coordinates.has(key)) {
        errors.push('mapCompliance.markers: coordinates must be unique');
      }
      coordinates.add(key);
      if (
        typeof marker.lat !== 'number' ||
        marker.lat < 3 ||
        marker.lat > 54 ||
        typeof marker.lng !== 'number' ||
        marker.lng < 73 ||
        marker.lng > 136
      ) {
        errors.push(`mapCompliance.markers[${index}]: outside China bounds`);
      }
    });
  }

  if (!isRecord(record.checks)) {
    errors.push('mapCompliance.checks: is required');
  } else {
    [
      'sourceRecord',
      'digest',
      'geometry',
      'eightMarkers',
      'fallbackList',
      'reducedMotion',
    ].forEach((field) => {
      if (record.checks[field] !== true) {
        errors.push(`mapCompliance.checks.${field}: must be true`);
      }
    });
  }

  const visual = record.humanVisualIntegrity;
  if (!isRecord(visual)) {
    errors.push('mapCompliance.humanVisualIntegrity: is required');
    return;
  }
  if (visual.referenceReviewNumber !== 'GS(2023)2762号') {
    errors.push('mapCompliance.humanVisualIntegrity.referenceReviewNumber: mismatch');
  }
  const viewports = Array.isArray(visual.viewports) ? visual.viewports : [];
  if (
    viewports.length !== REQUIRED_VIEWPORTS.length ||
    REQUIRED_VIEWPORTS.some((viewport) => !viewports.includes(viewport))
  ) {
    errors.push('mapCompliance.humanVisualIntegrity.viewports: four viewports are required');
  }
  [
    'mainlandOutline',
    'nationalBoundaries',
    'administrativeBoundaries',
    'majorIslands',
    'eightMarkers',
  ].forEach((field) => {
    if (visual[field] !== true) {
      errors.push(`mapCompliance.humanVisualIntegrity.${field}: must be true`);
    }
  });
}

function parseArguments(argv) {
  const options = {
    root: process.cwd(),
    source: 'src/data/mapSource.json',
    compliance: 'src/data/mapCompliance.json',
    resource: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!['--root', '--source', '--compliance', '--resource'].includes(argument)) {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a path`);
    }
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

export function runMapResourceCheck(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const root = resolve(options.root);
  const errors = [];
  const sourcePath = resolveInsideRoot(root, options.source, '--source', errors);
  const compliancePath = resolveInsideRoot(
    root,
    options.compliance,
    '--compliance',
    errors,
  );
  if (!sourcePath || !compliancePath) {
    errors.forEach((error) => console.error(`[map] ${error}`));
    return 1;
  }
  requireFile(sourcePath, 'mapSource.json', errors);
  requireFile(compliancePath, 'mapCompliance.json', errors);
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`[map] ${error}`));
    return 1;
  }

  const source = parseJson(sourcePath, errors, 'mapSource.json');
  const compliance = parseJson(compliancePath, errors, 'mapCompliance.json');
  const runtimeRecord = validateSourceRecord(source, root, errors);
  const resourcePath = resolveInsideRoot(
    root,
    options.resource ?? runtimeRecord?.path,
    'mapSource.runtimeResource.path',
    errors,
  );
  if (resourcePath && requireFile(resourcePath, 'runtimeResource', errors)) {
    const actualDigest = sha256(resourcePath);
    if (actualDigest !== runtimeRecord?.sha256) {
      errors.push(
        `mapSource.runtimeResource.sha256: digest mismatch (actual ${actualDigest})`,
      );
    }
    const resource = parseJson(resourcePath, errors, 'runtimeResource');
    validateGeometry(resource, errors);
  }
  validateCompliance(compliance, errors);

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`[map] ${error}`));
    return 1;
  }

  console.log('[map] source passed: 自然资源部 GS(2023)2762号 reference recorded');
  console.log('[map] digest passed: official reference and runtime SHA-256 recorded; available files match');
  console.log('[map] geometry passed: 34 province features and 1 maritime-boundary feature');
  console.log('[map] 8 markers passed: unique IDs and GCJ-02 coordinate bounds');
  console.log('[map] visual integrity passed: 390x844, 768x1024, 1366x768, 1920x1080');
  return 0;
}

const isCommandLine =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCommandLine) {
  try {
    process.exitCode = runMapResourceCheck();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
