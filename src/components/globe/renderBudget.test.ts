import { describe, expect, it } from 'vitest';

import { getRenderBudget } from './renderBudget';

describe('getRenderBudget', () => {
  it('uses a conservative budget on narrow high-density mobile screens', () => {
    expect(getRenderBudget({ width: 390, devicePixelRatio: 3 })).toEqual({
      antialias: false,
      pixelRatio: 1,
      animateRings: false,
    });
  });

  it('keeps antialiasing and animated rings on desktop while capping pixel ratio', () => {
    expect(getRenderBudget({ width: 1440, devicePixelRatio: 2 })).toEqual({
      antialias: true,
      pixelRatio: 1.25,
      animateRings: true,
    });
  });
});
