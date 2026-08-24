/**
 * 三维地球就绪前的长三角加载动画占位。
 * 只包含内联 SVG 与纯 CSS,不导入 globe.gl、Three.js 或地图 JSON。
 * 动画:岸线描边绘制 → 5 颗星点依次点亮 → 背景呼吸;reduced-motion 下静态。
 */
import useReducedMotion from '../../hooks/useReducedMotion';

export default function GlobeLoadingPlaceholder() {
  const reducedMotion = useReducedMotion();
  const motion = reducedMotion ? 'reduced' : 'full';

  return (
    <section
      aria-label="长三角地图加载占位"
      className="globe-placeholder"
      data-motion={motion}
      style={{
        position: 'relative',
        minHeight: '30rem',
        overflow: 'hidden',
        border: '1px solid var(--sand)',
        borderRadius: '1rem',
        background: 'var(--paper)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div className="globe-placeholder__glow" aria-hidden="true" />
      <svg
        aria-hidden="true"
        className="globe-placeholder__map"
        viewBox="0 0 600 400"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 抽象长三角轮廓:江岸与岛屿,非精确地理边界 */}
        <path
          className="globe-placeholder__coast globe-placeholder__coast--solid"
          d="M60 250 C 140 210, 210 235, 280 220 S 420 190, 540 205"
          fill="none"
          stroke="var(--brick-dark)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          className="globe-placeholder__coast globe-placeholder__coast--dashed"
          d="M60 265 C 150 300, 260 290, 370 305 S 520 285, 545 290"
          fill="none"
          stroke="var(--brick-dark)"
          strokeWidth="2"
          strokeDasharray="10 8"
          strokeLinecap="round"
        />
        <path
          className="globe-placeholder__island"
          d="M180 225 C 215 255, 255 255, 290 228"
          fill="none"
          stroke="var(--brick-dark)"
          strokeWidth="2"
          opacity="0.6"
        />
        {[
          [205, 255],
          [300, 247],
          [392, 240],
          [452, 238],
          [470, 222],
        ].map(([cx, cy], index) => (
          <path
            aria-hidden="true"
            className="globe-placeholder__star"
            data-star={index}
            d="M0 -10 L3 -3.4 9.5 -2.6 4.6 2 5.8 8.4 0 5.2 -5.8 8.4 -4.6 2 -9.5 -2.6 -3 -3.4 Z"
            fill="var(--brick)"
            key={`star-${index}`}
            transform={`translate(${cx} ${cy})`}
          />
        ))}
      </svg>
      <p
        className="globe-placeholder__status"
        role="status"
      >
        正在载入长三角红色足迹
        <span className="globe-placeholder__dots" aria-hidden="true">
          <span className="globe-placeholder__dot" />
          <span className="globe-placeholder__dot" />
          <span className="globe-placeholder__dot" />
        </span>
      </p>
    </section>
  );
}
