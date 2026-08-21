import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AppErrorBoundary from './AppErrorBoundary';

class SyntheticFailure extends Component<{ shouldThrow: boolean }> {
  render(): ReactNode {
    if (this.props.shouldThrow) {
      throw new Error('synthetic child failure');
    }

    return <p>地图子树已恢复</p>;
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AppErrorBoundary', () => {
  it('shows a safe explanation without exposing a stack and reports the error', () => {
    const onError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary onError={onError}>
        <SyntheticFailure shouldThrow />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('地图体验暂时无法显示');
    expect(screen.getByRole('button', { name: '重新尝试' })).toBeVisible();
    expect(screen.queryByText(/synthetic child failure/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/at SyntheticFailure/)).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('recovers without reloading the page and remounts the failed child subtree', () => {
    const reload = vi.fn();
    const onReset = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('location', { ...window.location, reload });
    const { rerender } = render(
      <AppErrorBoundary onReset={onReset}>
        <SyntheticFailure shouldThrow />
      </AppErrorBoundary>,
    );

    rerender(
      <AppErrorBoundary onReset={onReset}>
        <SyntheticFailure shouldThrow={false} />
      </AppErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: '重新尝试' }));

    expect(screen.getByText('地图子树已恢复')).toBeVisible();
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});
