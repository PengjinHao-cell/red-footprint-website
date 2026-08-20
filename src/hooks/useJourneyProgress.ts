import { useCallback, useRef, useState } from 'react';

const STORAGE_KEY = 'red-footprint:visited:v1';
const TOTAL_SITES = 8;

function getSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readVisitedIds(): string[] {
  try {
    const storedValue = getSessionStorage()?.getItem(STORAGE_KEY);
    if (storedValue === null || storedValue === undefined) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (
      !Array.isArray(parsedValue) ||
      !parsedValue.every((value) => typeof value === 'string')
    ) {
      return [];
    }

    return [...new Set(parsedValue)].slice(0, TOTAL_SITES);
  } catch {
    return [];
  }
}

function writeVisitedIds(visitedIds: ReadonlyArray<string>): void {
  try {
    getSessionStorage()?.setItem(STORAGE_KEY, JSON.stringify(visitedIds));
  } catch {
    // The React state remains the source of truth when storage is unavailable.
  }
}

export function useJourneyProgress() {
  const [visitedIds, setVisitedIds] = useState<string[]>(readVisitedIds);
  const visitedIdsRef = useRef(visitedIds);

  const markVisited = useCallback((id: string) => {
    const currentIds = visitedIdsRef.current;
    if (currentIds.includes(id) || currentIds.length >= TOTAL_SITES) {
      return;
    }

    const nextIds = [...currentIds, id];
    visitedIdsRef.current = nextIds;
    setVisitedIds(nextIds);
    writeVisitedIds(nextIds);
  }, []);

  const isVisited = useCallback(
    (id: string) => visitedIdsRef.current.includes(id),
    [],
  );

  const resetJourney = useCallback(() => {
    const emptyIds: string[] = [];
    visitedIdsRef.current = emptyIds;
    setVisitedIds(emptyIds);

    try {
      getSessionStorage()?.removeItem(STORAGE_KEY);
    } catch {
      // Reset still succeeds in memory when storage is unavailable.
    }
  }, []);

  return { visitedIds, markVisited, isVisited, resetJourney };
}

export default useJourneyProgress;
