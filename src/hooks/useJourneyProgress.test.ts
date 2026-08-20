import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useJourneyProgress from './useJourneyProgress';

const STORAGE_KEY = 'red-footprint:visited:v1';

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('useJourneyProgress', () => {
  it('starts with no visited sites', () => {
    const { result } = renderHook(() => useJourneyProgress());

    expect(result.current.visitedIds).toHaveLength(0);
  });

  it('counts one newly visited site', () => {
    const { result } = renderHook(() => useJourneyProgress());

    act(() => result.current.markVisited('site-1'));

    expect(result.current.visitedIds).toHaveLength(1);
  });

  it('counts a repeated site only once', () => {
    const { result } = renderHook(() => useJourneyProgress());

    act(() => {
      result.current.markVisited('site-1');
      result.current.markVisited('site-1');
    });

    expect(result.current.visitedIds).toEqual(['site-1']);
  });

  it('counts three different visited sites', () => {
    const { result } = renderHook(() => useJourneyProgress());

    act(() => {
      result.current.markVisited('site-1');
      result.current.markVisited('site-2');
      result.current.markVisited('site-3');
    });

    expect(result.current.visitedIds).toHaveLength(3);
  });

  it('identifies visited and unvisited site IDs', () => {
    const { result } = renderHook(() => useJourneyProgress());

    act(() => result.current.markVisited('site-1'));

    expect(result.current.isVisited('site-1')).toBe(true);
    expect(result.current.isVisited('site-2')).toBe(false);
  });

  it('resets the in-memory state and session storage', () => {
    const { result } = renderHook(() => useJourneyProgress());

    act(() => result.current.markVisited('site-1'));
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();

    act(() => result.current.resetJourney());

    expect(result.current.visitedIds).toHaveLength(0);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores visited sites when remounted in the same tab', () => {
    const firstMount = renderHook(() => useJourneyProgress());

    act(() => firstMount.result.current.markVisited('site-1'));
    firstMount.unmount();

    const secondMount = renderHook(() => useJourneyProgress());

    expect(secondMount.result.current.visitedIds).toEqual(['site-1']);
  });

  it('recovers with an empty collection when stored JSON is damaged', () => {
    sessionStorage.setItem(STORAGE_KEY, '{damaged');

    const { result } = renderHook(() => useJourneyProgress());

    expect(result.current.visitedIds).toHaveLength(0);
  });

  it('recovers with an empty collection when stored data is not a string array', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ visitedIds: ['site-1'] }),
    );

    const { result } = renderHook(() => useJourneyProgress());

    expect(result.current.visitedIds).toHaveLength(0);
  });

  it('keeps working in memory when reading session storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage read blocked');
    });

    const { result } = renderHook(() => useJourneyProgress());
    act(() => result.current.markVisited('site-1'));

    expect(result.current.visitedIds).toEqual(['site-1']);
  });

  it('keeps working in memory when writing session storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage write blocked');
    });

    const { result } = renderHook(() => useJourneyProgress());
    act(() => result.current.markVisited('site-1'));

    expect(result.current.visitedIds).toEqual(['site-1']);
  });

  it('never counts more than eight different site IDs', () => {
    const { result } = renderHook(() => useJourneyProgress());

    act(() => {
      for (let index = 1; index <= 9; index += 1) {
        result.current.markVisited(`site-${index}`);
      }
    });

    expect(result.current.visitedIds).toHaveLength(8);
    expect(result.current.isVisited('site-9')).toBe(false);
  });
});
