/** 准备阶段(0-75%)的总时长。 */
export const PENDING_PROGRESS_MS = 1_400;
/** ready 后从 75% 走到 100% 的时长。 */
export const READY_PROGRESS_MS = 350;
/** 100% 的短暂停留时长。 */
export const READY_HOLD_MS = 150;
/** 加载层与地图的交叉淡化时长。 */
export const CROSS_FADE_MS = 300;

/**
 * 准备进度:地图未 ready 前从 0 缓出增长,封顶 75%。
 * 使用 floor 保证只有满 1400ms 才恰好到达 75,避免四舍五入提前封顶。
 * 名称刻意使用"准备"而非"下载",因为 Globe.gl 不提供可靠的逐字节下载进度。
 */
export function getPendingProgress(elapsedMs: number) {
  const ratio = Math.min(1, Math.max(0, elapsedMs / PENDING_PROGRESS_MS));
  const eased = 1 - (1 - ratio) ** 3;
  return Math.min(75, Math.floor(eased * 75));
}

/**
 * 完成进度:收到 ready 后从 75% 平滑走到 100%。
 */
export function getReadyProgress(elapsedMs: number) {
  const ratio = Math.min(1, Math.max(0, elapsedMs / READY_PROGRESS_MS));
  const eased = 1 - (1 - ratio) ** 3;
  return Math.min(100, Math.floor(75 + eased * 25));
}
