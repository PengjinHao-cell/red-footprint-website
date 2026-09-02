import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import CityMapViewport from './CityMapViewport.tsx';

afterEach(cleanup);

function renderViewport() {
  render(
    <CityMapViewport viewBox={{ width: 1000, height: 800 }}>
      <div data-testid="world-child">world</div>
    </CityMapViewport>,
  );
  return screen.getByTestId('city-map-viewport');
}

describe('CityMapViewport', () => {
  it('zooms in, clamps zoom out at the lower bound, and resets to scale 1', () => {
    const viewport = renderViewport();
    expect(viewport).toHaveAttribute('data-scale', '1');

    fireEvent.click(screen.getByRole('button', { name: '放大地图' }));
    expect(Number(viewport.getAttribute('data-scale'))).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole('button', { name: '复位地图' }));
    expect(viewport).toHaveAttribute('data-scale', '1');

    fireEvent.click(screen.getByRole('button', { name: '缩小地图' }));
    expect(viewport).toHaveAttribute('data-scale', '1');
  });

  it('exposes three keyboard-focusable controls and returns focus to zoom-in on reset', () => {
    renderViewport();
    const zoomIn = screen.getByRole('button', { name: '放大地图' });
    const zoomOut = screen.getByRole('button', { name: '缩小地图' });
    const reset = screen.getByRole('button', { name: '复位地图' });

    for (const button of [zoomIn, zoomOut, reset]) {
      button.focus();
      expect(button).toHaveFocus();
    }

    fireEvent.click(reset);
    expect(zoomIn).toHaveFocus();
  });

  it('zooms with the wheel around the pointer position', () => {
    const viewport = renderViewport();
    expect(viewport).toHaveAttribute('data-scale', '1');

    fireEvent.wheel(viewport, { deltaY: -120, clientX: 12, clientY: 8 });
    expect(Number(viewport.getAttribute('data-scale'))).toBeGreaterThan(1);

    fireEvent.wheel(viewport, { deltaY: 120, clientX: 12, clientY: 8 });
    expect(Number(viewport.getAttribute('data-scale'))).toBeGreaterThanOrEqual(1);
  });

  it('renders children inside the world layer', () => {
    renderViewport();
    expect(screen.getByTestId('world-child')).toBeInTheDocument();
  });
});
