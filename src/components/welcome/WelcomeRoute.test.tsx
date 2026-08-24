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

  it('renders four route segments and five anchored stars', () => {
    const { container } = render(<WelcomeRoute />);

    expect(container.querySelectorAll('.welcome-route__segment')).toHaveLength(
      4,
    );
    expect(container.querySelectorAll('.welcome-route__star')).toHaveLength(5);
    expect(
      container.querySelectorAll('.welcome-route__star-anchor'),
    ).toHaveLength(5);
  });

  it('fixes star coordinates on anchor groups and animates only the inner star path', () => {
    const { container } = render(<WelcomeRoute />);

    const anchors = container.querySelectorAll('.welcome-route__star-anchor');
    expect(anchors[0]?.getAttribute('transform')).toBe('translate(90 230)');
    expect(anchors[4]?.getAttribute('transform')).toBe('translate(480 120)');

    const star = anchors[0]?.querySelector('.welcome-route__star');
    expect(star?.getAttribute('transform')).toBeNull();
  });
});
