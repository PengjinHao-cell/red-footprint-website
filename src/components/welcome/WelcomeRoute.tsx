type WelcomeRouteProps = {
  motion?: 'full' | 'reduced';
};

const STAR_POINTS = [
  { cx: 90, cy: 230 },
  { cx: 180, cy: 170 },
  { cx: 285, cy: 150 },
  { cx: 395, cy: 175 },
  { cx: 480, cy: 120 },
];

const STAR_PATH =
  'M0 -9 L2.6 -3.2 8.6 -2.6 4.1 1.6 5.3 7.6 0 4.6 -5.3 7.6 -4.1 1.6 -8.6 -2.6 -2.6 -3.2 Z';

/**
 * 开屏"足迹连线"装饰动画:5 个抽象星点 + 4 段依次绘制的连线。
 * 外层 <g> 固定星点坐标,内层 path 只做透明度/缩放动画,避免 CSS transform 覆盖坐标;
 * 星点不标注站点名称,不冒充真实地理坐标;全部子元素对辅助技术隐藏。
 */
export default function WelcomeRoute({ motion = 'full' }: WelcomeRouteProps) {
  return (
    <div
      className="welcome-route"
      data-motion={motion}
      aria-hidden="true"
    >
      <svg
        aria-label="红色足迹路线动画"
        role="img"
        viewBox="0 0 560 300"
        preserveAspectRatio="xMidYMid meet"
        className="welcome-route__svg"
      >
        {STAR_POINTS.slice(0, -1).map((point, index) => {
          const next = STAR_POINTS[index + 1];
          return (
            <path
              aria-hidden="true"
              className="welcome-route__segment"
              data-step={index}
              d={`M${point.cx} ${point.cy} L${next.cx} ${next.cy}`}
              fill="none"
              key={`segment-${index}`}
              stroke="#982e2d"
              strokeLinecap="round"
              strokeWidth="3"
            />
          );
        })}
        {STAR_POINTS.map(({ cx, cy }, index) => (
          <g
            aria-hidden="true"
            className="welcome-route__star-anchor"
            key={`star-${index}`}
            transform={`translate(${cx} ${cy})`}
          >
            <path
              className="welcome-route__star"
              data-step={index}
              d={STAR_PATH}
              fill="#982e2d"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
