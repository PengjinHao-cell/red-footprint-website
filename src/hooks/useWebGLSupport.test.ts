import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useWebGLSupport, { detectWebGLSupport } from './useWebGLSupport';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockCanvas(getContext: (contextId: string) => object | null) {
  const canvas = { getContext } as unknown as HTMLCanvasElement;
  const createElement = document.createElement.bind(document);

  return vi.spyOn(document, 'createElement').mockImplementation(
    ((tagName: string, options?: ElementCreationOptions) =>
      tagName.toLowerCase() === 'canvas'
        ? canvas
        : createElement(tagName, options)) as typeof document.createElement,
  );
}

describe('useWebGLSupport', () => {
  it('returns supported when WebGL2 is available', () => {
    const getContext = vi.fn((contextId: string) =>
      contextId === 'webgl2' ? {} : null,
    );
    mockCanvas(getContext);

    const { result } = renderHook(() => useWebGLSupport());

    expect(result.current).toBe(true);
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(getContext).toHaveBeenCalledWith('webgl2');
  });

  it('falls back to WebGL when WebGL2 is unavailable', () => {
    const webglContext = {};
    const getContext = vi.fn((contextId: string) =>
      contextId === 'webgl' ? webglContext : null,
    );
    mockCanvas(getContext);

    const { result } = renderHook(() => useWebGLSupport());

    expect(result.current).toBe(true);
    expect(getContext.mock.calls.map(([contextId]) => contextId)).toEqual([
      'webgl2',
      'webgl',
    ]);
  });

  it('returns unsupported when neither WebGL version is available', () => {
    mockCanvas(() => null);

    const { result } = renderHook(() => useWebGLSupport());

    expect(result.current).toBe(false);
  });

  it('returns unsupported when canvas creation throws', () => {
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('canvas blocked');
    });

    expect(detectWebGLSupport()).toBe(false);
  });

  it('returns unsupported when context creation throws', () => {
    mockCanvas(() => {
      throw new Error('context blocked');
    });

    expect(detectWebGLSupport()).toBe(false);
  });

  it('returns unsupported when the DOM is unavailable', () => {
    vi.stubGlobal('document', undefined);

    expect(detectWebGLSupport()).toBe(false);
  });
});
