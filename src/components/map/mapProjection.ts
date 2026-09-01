export type Coordinates = { lat: number; lng: number };
export type ProjectedPoint = { x: number; y: number };
export type ViewBox = { width: number; height: number };

export type GeoBounds = {
  kind: 'bounds';
  north: number;
  south: number;
  east: number;
  west: number;
};

export type AffineControlPoint = {
  coordinates: Coordinates;
  pixel: ProjectedPoint;
};

export type AffineProjection = {
  kind: 'affine';
  controlPoints: AffineControlPoint[];
};

export type Projection = GeoBounds | AffineProjection;

type AffineModel = {
  origin: Coordinates;
  x: [number, number, number];
  y: [number, number, number];
};

export type AffineDiagnostics = {
  residualPixels: number[];
  rmsResidualPixels: number;
  maxResidualPixels: number;
  leaveOneOutPixels: number[];
  maxLeaveOneOutPixels: number;
};

function solveThreeByThree(matrix: number[][], values: number[]): [number, number, number] {
  const augmented = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (!Number.isFinite(divisor) || Math.abs(divisor) < 1e-12) {
      throw new Error('Invalid city-map projection parameters');
    }
    for (let index = column; index < 4; index += 1) augmented[column][index] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index < 4; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }

  return [augmented[0][3], augmented[1][3], augmented[2][3]];
}

function fitAffine(controlPoints: AffineControlPoint[]): AffineModel {
  if (controlPoints.length < 3) throw new Error('Invalid city-map projection parameters');
  const origin = {
    lat: controlPoints.reduce((sum, point) => sum + point.coordinates.lat, 0) / controlPoints.length,
    lng: controlPoints.reduce((sum, point) => sum + point.coordinates.lng, 0) / controlPoints.length,
  };
  const rows = controlPoints.map(({ coordinates }) => [
    coordinates.lng - origin.lng,
    coordinates.lat - origin.lat,
    1,
  ]);
  const normal = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) =>
      rows.reduce((sum, values) => sum + values[row] * values[column], 0),
    ),
  );
  const solveAxis = (axis: 'x' | 'y') =>
    solveThreeByThree(
      normal.map((row) => [...row]),
      rows.map((row, index) => row.map((value) => value * controlPoints[index].pixel[axis]))
        .reduce((totals, values) => totals.map((value, index) => value + values[index]), [0, 0, 0]),
    );

  return { origin, x: solveAxis('x'), y: solveAxis('y') };
}

function applyAffine(point: Coordinates, model: AffineModel): ProjectedPoint {
  const lng = point.lng - model.origin.lng;
  const lat = point.lat - model.origin.lat;
  return {
    x: model.x[0] * lng + model.x[1] * lat + model.x[2],
    y: model.y[0] * lng + model.y[1] * lat + model.y[2],
  };
}

export function projectCoordinate(
  point: Coordinates,
  projection: Projection,
  viewBox: ViewBox,
): ProjectedPoint {
  const projected = projection.kind === 'affine'
    ? applyAffine(point, fitAffine(projection.controlPoints))
    : {
        x: ((point.lng - projection.west) / (projection.east - projection.west)) * viewBox.width,
        y: ((projection.north - point.lat) / (projection.north - projection.south)) * viewBox.height,
      };

  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
    throw new Error('Invalid city-map projection parameters');
  }
  return projected;
}

export function calculateAffineDiagnostics(
  controlPoints: AffineControlPoint[],
): AffineDiagnostics {
  const model = fitAffine(controlPoints);
  const residualPixels = controlPoints.map((point) => {
    const projected = applyAffine(point.coordinates, model);
    return Math.hypot(projected.x - point.pixel.x, projected.y - point.pixel.y);
  });
  const leaveOneOutPixels = controlPoints.map((point, omittedIndex) => {
    const remaining = controlPoints.filter((_, index) => index !== omittedIndex);
    const projected = applyAffine(point.coordinates, fitAffine(remaining));
    return Math.hypot(projected.x - point.pixel.x, projected.y - point.pixel.y);
  });

  return {
    residualPixels,
    rmsResidualPixels: Math.sqrt(
      residualPixels.reduce((sum, value) => sum + value * value, 0) / residualPixels.length,
    ),
    maxResidualPixels: Math.max(...residualPixels),
    leaveOneOutPixels,
    maxLeaveOneOutPixels: Math.max(...leaveOneOutPixels),
  };
}
