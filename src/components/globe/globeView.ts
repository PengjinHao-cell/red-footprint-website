export type GlobeView = { lat: number; lng: number; altitude: number };

export function getYangtzeDeltaOverview(width: number): GlobeView {
  if (width < 600) return { lat: 32, lng: 120, altitude: 0.9 };
  if (width < 900) return { lat: 32, lng: 120, altitude: 0.78 };
  return { lat: 32, lng: 120, altitude: 0.65 };
}
