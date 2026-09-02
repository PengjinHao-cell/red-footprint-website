export type SiteAnchor<T> = {
  id: T;
  x: number;
  y: number;
};

export function nearestSiteId<T>(
  candidates: ReadonlyArray<SiteAnchor<T>>,
  clickX: number,
  clickY: number,
  maxDistance: number,
): T | null {
  let nearest: T | null = null;
  let nearestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = Math.hypot(clickX - candidate.x, clickY - candidate.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = candidate.id;
    }
  }

  return nearestDistance <= maxDistance ? nearest : null;
}
