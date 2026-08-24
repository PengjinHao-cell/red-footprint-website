export type MarkerLayout = {
  id: string;
  anchor: { lat: number; lng: number };
  offset: { x: number; y: number };
};

type MarkerInput = {
  id: string;
  lat: number;
  lng: number;
};

const MAX_OFFSET_RADIUS = 28;
const CLUSTER_DEGREES = 0.15;

const OFFSET_SEQUENCE: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

function scaleOffset(
  offset: { x: number; y: number },
  radius: number,
): { x: number; y: number } {
  const length = Math.hypot(offset.x, offset.y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: (offset.x / length) * radius, y: (offset.y / length) * radius };
}

/**
 * 为屏幕投影过近的站点生成稳定的视觉偏移,并保留真实经纬度锚点。
 * 偏移仅用于同城/近邻避让展示,绝不改写 anchor。
 */
export function layoutNearbyMarkers(
  markers: ReadonlyArray<MarkerInput>,
): MarkerLayout[] {
  const sorted = [...markers].sort((a, b) => a.id.localeCompare(b.id));

  const clusters: Array<Array<MarkerInput>> = [];
  for (const marker of sorted) {
    const cluster = clusters.find(
      (candidate) =>
        Math.hypot(
          candidate[0].lat - marker.lat,
          candidate[0].lng - marker.lng,
        ) < CLUSTER_DEGREES,
    );
    if (cluster) {
      cluster.push(marker);
    } else {
      clusters.push([marker]);
    }
  }

  return sorted.map((marker) => {
    const cluster = clusters.find((candidate) => candidate.includes(marker));
    const indexInCluster = cluster ? cluster.indexOf(marker) : 0;
    const direction =
      OFFSET_SEQUENCE[indexInCluster % OFFSET_SEQUENCE.length];
    const radius =
      indexInCluster === 0
        ? 0
        : MAX_OFFSET_RADIUS * (1 - (indexInCluster - 1) * 0.12);

    return {
      id: marker.id,
      anchor: { lat: marker.lat, lng: marker.lng },
      offset: scaleOffset(direction, radius),
    };
  });
}
