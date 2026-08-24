type WelcomeRouteProps = {
  motion?: 'full' | 'reduced';
  variant?: 'full' | 'short';
};

const STAR_POINTS = [
  { cx: 90, cy: 230 },
  { cx: 180, cy: 170 },
  { cx: 285, cy: 150 },
  { cx: 395, cy: 175 },
  { cx: 480, cy: 120 },
];

const MAIN_PATH =
  'M90 230 C 130 205, 150 185, 180 170 S 250 155, 285 150 S 355 165, 395 175 S 450 140, 480 120';

/**
 * 开屏"足迹连线"装饰动画:5 个抽象星点 + 1 条暖红路线。
 * 星点不标注站点名称,不冒充真实地理坐标;全部子元素对辅助技术隐藏。
 */
export default function WelcomeRoute({
  motion = 'full',
  variant = 'full',
}: WelcomeRouteProps) {
  return (
    <div
      className="welcome-route"
      data-motion={motion}
      data-variant={variant}
      aria-hidden="true"
    >
      <svg
        aria-label="红色足迹路线动画"
        role="img"
        viewBox="0 0 560 300"
        preserveAspectRatio="xMidYMid meet"
        className="welcome-route__svg"
      >
        <path
          className="welcome-route__line"
          d={MAIN_PATH}
          fill="none"
          stroke="#982e2d"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        />
        {STAR_POINTS.map(({ cx, cy }, index) => (
          <path
            aria-hidden="true"
            className="welcome-route__star"
            d="M0 -9 L2.6 -3.2 8.6 -2.6 4.1 1.6 5.3 7.6 0 4.6 -5.3 7.6 -4.1 1.6 -8.6 -2.6 -2.6 -3.2 Z"
            fill="#982e2d"
            key={`star-${index}`}
            transform={`translate(${cx} ${cy}) scale(0.85)`}
          />
        ))}
      </svg>
    </div>
  );
}
