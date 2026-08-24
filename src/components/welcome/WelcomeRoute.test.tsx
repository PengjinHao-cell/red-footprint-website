import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import WelcomeRoute from './WelcomeRoute';

describe('WelcomeRoute', () => {
  it('renders an accessible abstract route animation', () => {
    render(<WelcomeRoute />);

    expect(screen.getByLabelText('红色足迹路线动画')).toBeInTheDocument();
  });

  it('marks decorative sub-elements as hidden', () => {
    const { container } = render(<WelcomeRoute />);
    const svg = container.querySelector('svg[aria-label="红色足迹路线动画"]');

    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(
      0,
    );
  });
});
