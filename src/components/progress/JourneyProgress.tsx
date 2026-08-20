const TOTAL_SITES = 8;

type JourneyProgressProps = {
  visitedCount: number;
};

export default function JourneyProgress({
  visitedCount,
}: JourneyProgressProps) {
  const safeCount = Number.isFinite(visitedCount)
    ? Math.min(TOTAL_SITES, Math.max(0, Math.trunc(visitedCount)))
    : 0;
  const progressLabel = `已点亮 ${safeCount} / ${TOTAL_SITES} 处红色坐标`;

  return (
    <div className="journey-progress">
      <span>{progressLabel}</span>
      <progress
        aria-label={progressLabel}
        max={TOTAL_SITES}
        value={safeCount}
      />
    </div>
  );
}
