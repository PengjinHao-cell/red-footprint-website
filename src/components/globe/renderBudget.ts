export type RenderBudget = {
  antialias: boolean;
  pixelRatio: number;
  animateRings: boolean;
};

const MOBILE_WIDTH = 600;
const DESKTOP_PIXEL_RATIO_CAP = 1.25;

/**
 * 只依赖 width 与 devicePixelRatio 计算渲染预算,便于测试。
 * 不读取任何全局状态。
 */
export function getRenderBudget(input: {
  width: number;
  devicePixelRatio: number;
}): RenderBudget {
  const { width, devicePixelRatio } = input;
  const mobile = width < MOBILE_WIDTH;

  if (mobile) {
    return {
      antialias: false,
      pixelRatio: 1,
      animateRings: false,
    };
  }

  return {
    antialias: true,
    pixelRatio: Math.min(
      DESKTOP_PIXEL_RATIO_CAP,
      Math.max(1, devicePixelRatio),
    ),
    animateRings: true,
  };
}
