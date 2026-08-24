export function prefetchGlobeModule() {
  return import('globe.gl');
}

export function scheduleIdleTask(callback: () => void): () => void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback);
    return () => window.cancelIdleCallback(id);
  }

  const timer = setTimeout(callback, 250);
  return () => clearTimeout(timer);
}
