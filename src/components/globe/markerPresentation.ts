export type MarkerPresentationInput = {
  altitude: number;
  overviewAltitude: number;
  precisionAltitude: number;
  baseOffset: { x: number; y: number };
};

export type MarkerPresentation = {
  offset: { x: number; y: number };
  scale: number;
};

export const MAX_MARKER_SCALE = 1.45;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * 根据相机高度计算红星在总览与精确阶段之间的缩放与近邻避让偏移。
 *
 * - 总览阶段（altitude >= overviewAltitude）：保持基础尺寸，偏移为原始布局偏移；
 * - 放大阶段：红星逐渐放大，偏移同步缩小；
 * - 达到精确阈值（altitude <= precisionAltitude）：尺寸封顶，偏移归零，
 *   红星始终贴在真实经纬度锚点的屏幕投影上，继续放大不再变化。
 */
export function getMarkerPresentation({
  altitude,
  overviewAltitude,
  precisionAltitude,
  baseOffset,
}: MarkerPresentationInput): MarkerPresentation {
  const range = overviewAltitude - precisionAltitude;
  const zoomProgress =
    range <= 0
      ? 1
      : clamp((overviewAltitude - altitude) / range, 0, 1);
  const offsetScale = 1 - zoomProgress;

  return {
    offset: {
      x: baseOffset.x * offsetScale + 0,
      y: baseOffset.y * offsetScale + 0,
    },
    scale: 1 + (MAX_MARKER_SCALE - 1) * zoomProgress,
  };
}
