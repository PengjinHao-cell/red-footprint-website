import { describe, expect, it } from 'vitest';

import { isTapGesture } from './pointerIntent';

describe('isTapGesture', () => {
  it('accepts a short stationary single-pointer gesture', () => {
    expect(
      isTapGesture(
        { x: 100, y: 100, pointerId: 1, pointerType: 'touch' },
        { x: 106, y: 104, pointerId: 1, pointerType: 'touch' },
      ),
    ).toBe(true);
  });

  it('rejects globe dragging and a mismatched pointer', () => {
    expect(
      isTapGesture(
        { x: 100, y: 100, pointerId: 1, pointerType: 'touch' },
        { x: 116, y: 100, pointerId: 1, pointerType: 'touch' },
      ),
    ).toBe(false);
    expect(
      isTapGesture(
        { x: 100, y: 100, pointerId: 1, pointerType: 'touch' },
        { x: 100, y: 100, pointerId: 2, pointerType: 'touch' },
      ),
    ).toBe(false);
  });
});
