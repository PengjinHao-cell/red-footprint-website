import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteSchema, type Site } from '../../data/siteSchema';
import { validEightSites } from '../../test/fixtures/sites';
import SiteListFallback from './SiteListFallback';

const sites: Site[] = siteSchema.array().parse(validEightSites);

afterEach(cleanup);

describe('SiteListFallback', () => {
  it('renders exactly eight native buttons without WebGL', () => {
    render(<SiteListFallback sites={sites} onSelect={() => undefined} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
    buttons.forEach((button) => {
      expect(button.tagName).toBe('BUTTON');
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('uses every formal site name as a button accessible name', () => {
    render(<SiteListFallback sites={sites} onSelect={() => undefined} />);

    sites.forEach((site) => {
      expect(
        screen.getByRole('button', { name: site.officialName }),
      ).toBeVisible();
    });
  });

  it('selects the corresponding site exactly once per click', () => {
    const onSelect = vi.fn();
    render(<SiteListFallback sites={sites} onSelect={onSelect} />);

    fireEvent.click(
      screen.getByRole('button', { name: sites[3].officialName }),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(sites[3].id);
  });

  it('keeps each site reachable through the native keyboard tab order', () => {
    render(<SiteListFallback sites={sites} onSelect={() => undefined} />);

    screen.getAllByRole('button').forEach((button) => {
      expect(button.tabIndex).toBe(0);
    });
  });
});
