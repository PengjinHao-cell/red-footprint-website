import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useReducedMotion from './useReducedMotion';

type ChangeListener = (event: MediaQueryListEvent) => void;

function createModernMediaQuery(initialMatches: boolean) {
  let listener: ChangeListener | undefined;
  const addEventListener = vi.fn(
    (_type: string, nextListener: ChangeListener) => {
      listener = nextListener;
    },
  );
  const removeEventListener = vi.fn(
    (_type: string, removedListener: ChangeListener) => {
      if (listener === removedListener) {
        listener = undefined;
      }
    },
  );
  const mediaQuery = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  return {
    mediaQuery: mediaQuery as unknown as MediaQueryList,
    addEventListener,
    removeEventListener,
    emit(matches: boolean) {
      mediaQuery.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
  };
}

function createLegacyMediaQuery(initialMatches: boolean) {
  let listener: ChangeListener | undefined;
  const addListener = vi.fn((nextListener: ChangeListener) => {
    listener = nextListener;
  });
  const removeListener = vi.fn((removedListener: ChangeListener) => {
    if (listener === removedListener) {
      listener = undefined;
    }
  });
  const mediaQuery = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener,
    removeListener,
    dispatchEvent: vi.fn(),
  };

  return {
    mediaQuery: mediaQuery as unknown as MediaQueryList,
    addListener,
    removeListener,
    emit(matches: boolean) {
      mediaQuery.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('reads prefers-reduced-motion on first render', () => {
    const { mediaQuery } = createModernMediaQuery(true);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('responds to modern media-query changes and removes the listener', () => {
    const { addEventListener, emit, mediaQuery, removeEventListener } =
      createModernMediaQuery(false);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const { result, unmount } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => emit(true));
    expect(result.current).toBe(true);

    const registeredListener = addEventListener.mock.calls[0]?.[1];
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      registeredListener,
    );
  });

  it('supports legacy addListener and removeListener media queries', () => {
    const { addListener, emit, mediaQuery, removeListener } =
      createLegacyMediaQuery(false);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const { result, unmount } = renderHook(() => useReducedMotion());

    act(() => emit(true));
    expect(result.current).toBe(true);

    const registeredListener = addListener.mock.calls[0]?.[0];
    unmount();

    expect(removeListener).toHaveBeenCalledWith(registeredListener);
  });

  it('falls back to false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
