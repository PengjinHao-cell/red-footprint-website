export type MapMarkerRecord = {
  id: string;
  officialName: string;
  lat: number;
  lng: number;
};

export type MapIntegrityRecord = {
  status: 'integrity-checked';
  purpose: string;
  derivedThreeDimensionalResource: true;
  newReviewClaimed: false;
  coordinateSystem: 'GCJ-02';
  markers: MapMarkerRecord[];
  checks: {
    sourceRecord: true;
    digest: true;
    geometry: true;
    eightMarkers: true;
    fallbackList: true;
    reducedMotion: true;
  };
  humanVisualIntegrity: {
    referenceReviewNumber: 'GS(2023)2762号';
    checkedAt: string;
    viewports: string[];
    mainlandOutline: true;
    nationalBoundaries: true;
    administrativeBoundaries: true;
    majorIslands: true;
    eightMarkers: true;
  };
};

const REQUIRED_VIEWPORTS = [
  '390x844',
  '768x1024',
  '1366x768',
  '1920x1080',
] as const;

const LEGACY_APPROVAL_FIELDS = [
  'publicUseAllowed',
  'verifiedBy',
  'signature',
  'newReviewNumber',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function validateMarkers(value: unknown, errors: string[]) {
  if (!Array.isArray(value) || value.length !== 8) {
    errors.push('markers: exactly 8 marker records are required');
    return;
  }

  const ids = new Set<string>();
  const coordinates = new Set<string>();

  value.forEach((marker, index) => {
    const prefix = `markers[${index}]`;
    if (!isRecord(marker)) {
      errors.push(`${prefix}: must be an object`);
      return;
    }

    if (typeof marker.id !== 'string' || !/^[a-z0-9-]+$/.test(marker.id)) {
      errors.push(`${prefix}.id: must be a stable kebab-case ID`);
    } else if (ids.has(marker.id)) {
      errors.push('markers: IDs and coordinates must be unique');
    } else {
      ids.add(marker.id);
    }

    if (
      typeof marker.officialName !== 'string' ||
      marker.officialName.trim().length < 2
    ) {
      errors.push(`${prefix}.officialName: is required`);
    }

    if (
      typeof marker.lat !== 'number' ||
      !Number.isFinite(marker.lat) ||
      marker.lat < 3 ||
      marker.lat > 54 ||
      typeof marker.lng !== 'number' ||
      !Number.isFinite(marker.lng) ||
      marker.lng < 73 ||
      marker.lng > 136
    ) {
      errors.push(`${prefix}: coordinates must be within China bounds`);
      return;
    }

    const coordinateKey = `${marker.lat},${marker.lng}`;
    if (coordinates.has(coordinateKey)) {
      errors.push('markers: IDs and coordinates must be unique');
    }
    coordinates.add(coordinateKey);
  });
}

function validateChecks(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push('checks: source, digest, geometry, markers, fallback, and motion checks are required');
    return;
  }

  [
    'sourceRecord',
    'digest',
    'geometry',
    'eightMarkers',
    'fallbackList',
    'reducedMotion',
  ].forEach((field) => {
    if (value[field] !== true) {
      errors.push(`checks.${field}: must be true`);
    }
  });
}

function validateHumanVisualIntegrity(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push('humanVisualIntegrity: completed visual checks are required');
    return;
  }

  if (value.referenceReviewNumber !== 'GS(2023)2762号') {
    errors.push(
      'humanVisualIntegrity.referenceReviewNumber: must identify GS(2023)2762号',
    );
  }
  if (!isIsoDate(value.checkedAt)) {
    errors.push('humanVisualIntegrity.checkedAt: must be a real YYYY-MM-DD date');
  }

  const viewports = Array.isArray(value.viewports) ? value.viewports : [];
  if (
    viewports.length !== REQUIRED_VIEWPORTS.length ||
    REQUIRED_VIEWPORTS.some((viewport) => !viewports.includes(viewport))
  ) {
    errors.push(
      `humanVisualIntegrity.viewports: must include ${REQUIRED_VIEWPORTS.join(', ')}`,
    );
  }

  [
    'mainlandOutline',
    'nationalBoundaries',
    'administrativeBoundaries',
    'majorIslands',
    'eightMarkers',
  ].forEach((field) => {
    if (value[field] !== true) {
      errors.push(`humanVisualIntegrity.${field}: must be true`);
    }
  });
}

export function validateMapCompliance(input: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return ['mapCompliance: must be a JSON object'];
  }

  if (input.status !== 'integrity-checked') {
    errors.push('status: must be integrity-checked');
  }
  if (typeof input.purpose !== 'string' || input.purpose.trim().length < 10) {
    errors.push('purpose: must explain the internal integrity check');
  }
  if (input.derivedThreeDimensionalResource !== true) {
    errors.push('derivedThreeDimensionalResource: must be true');
  }
  if (input.newReviewClaimed !== false) {
    errors.push('newReviewClaimed: must remain false');
  }
  if (input.coordinateSystem !== 'GCJ-02') {
    errors.push('coordinateSystem: must be GCJ-02');
  }

  LEGACY_APPROVAL_FIELDS.forEach((field) => {
    if (field in input) {
      errors.push(`${field}: legacy approval fields must be removed`);
    }
  });

  validateMarkers(input.markers, errors);
  validateChecks(input.checks, errors);
  validateHumanVisualIntegrity(input.humanVisualIntegrity, errors);

  return errors;
}
