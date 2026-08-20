import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('shows the site title as a level-one heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '青春寻访·红色足迹',
      }),
    ).toBeInTheDocument();
  });
});
