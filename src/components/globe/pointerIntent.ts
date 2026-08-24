export type PointerSample = {
  x: number;
  y: number;
  pointerId: number;
  pointerType: string;
};

/** 轻点与拖动之间的最大允许位移（像素），超过即视为旋转/缩放手势。 */
export const TAP_DISTANCE_PX = 10;

/**
 * 判断一次指针手势是否为近似静止的轻点。
 * 多指触摸（pointerId 不一致）或移动超过阈值都不算轻点。
 */
export function isTapGesture(start: PointerSample, end: PointerSample) {
  if (start.pointerId !== end.pointerId) return false;
  return Math.hypot(end.x - start.x, end.y - start.y) <= TAP_DISTANCE_PX;
}
