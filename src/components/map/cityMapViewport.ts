export type CityMapViewportState = {
  scale: number;
  translateX: number;
  translateY: number;
};

export const MIN_CITY_SCALE = 1;
export const MAX_CITY_SCALE = 2.5;

export function clampScale(scale: number): number {
  return Math.min(MAX_CITY_SCALE, Math.max(MIN_CITY_SCALE, scale));
}

export function resetViewport(): CityMapViewportState {
  return { scale: 1, translateX: 0, translateY: 0 };
}

export function zoomAtPoint(
  state: CityMapViewportState,
  anchorX: number,
  anchorY: number,
  nextScale: number,
): CityMapViewportState {
  const scale = clampScale(nextScale);
  if (scale === state.scale) {
    return { ...state };
  }
  const ratio = scale / state.scale;
  return {
    scale,
    translateX: anchorX - (anchorX - state.translateX) * ratio,
    translateY: anchorY - (anchorY - state.translateY) * ratio,
  };
}
