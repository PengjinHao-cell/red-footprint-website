import { useState } from 'react';

const CONTEXT_IDS = ['webgl2', 'webgl'] as const;

export function detectWebGLSupport(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  let canvas: HTMLCanvasElement;

  try {
    canvas = document.createElement('canvas');
  } catch {
    return false;
  }

  for (const contextId of CONTEXT_IDS) {
    try {
      if (canvas.getContext(contextId) !== null) {
        return true;
      }
    } catch {
      // A blocked context is treated as unavailable; try the next version.
    }
  }

  return false;
}

export default function useWebGLSupport(): boolean {
  const [isSupported] = useState(detectWebGLSupport);

  return isSupported;
}
