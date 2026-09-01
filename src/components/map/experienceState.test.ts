import { describe, expect, it } from 'vitest';

import { transition, type ExperienceEvent, type ExperienceState } from './experienceState';

describe('experienceState transition', () => {
  it('moves through national, entering city, and city states', () => {
    const entering = transition(
      { view: 'national' },
      { type: 'SELECT_CITY', cityId: 'nanjing' },
    );
    expect(entering).toEqual({ view: 'entering-city', cityId: 'nanjing' });
    expect(transition(entering, { type: 'CITY_ENTERED' })).toEqual({
      view: 'city',
      cityId: 'nanjing',
    });
  });

  it('opens a city site and returns to the same city after detail', () => {
    const travelling = transition(
      { view: 'city', cityId: 'nanjing' },
      { type: 'SELECT_SITE', siteId: 'yuhuatai-martyrs' },
    );
    expect(travelling).toEqual({
      view: 'travelling-site',
      cityId: 'nanjing',
      siteId: 'yuhuatai-martyrs',
    });
    const detail = transition(travelling, { type: 'SITE_REACHED' });
    expect(detail).toEqual({
      view: 'detail',
      cityId: 'nanjing',
      siteId: 'yuhuatai-martyrs',
      origin: 'city-map',
    });
    const returning = transition(detail, { type: 'CLOSE_DETAIL' });
    expect(transition(returning, { type: 'SITE_RETURNED' })).toEqual({
      view: 'city',
      cityId: 'nanjing',
    });
  });

  it('returns from a stable city directly to the national map', () => {
    expect(
      transition(
        { view: 'city', cityId: 'shanghai' },
        { type: 'BACK_TO_NATIONAL' },
      ),
    ).toEqual({ view: 'national' });
  });

  it('returns to the national view after closing a directory-opened detail', () => {
    const state: ExperienceState = {
      view: 'detail',
      siteId: 'sihong-memorial',
      origin: 'directory',
      cityId: null,
    };

    expect(transition(state, { type: 'CLOSE_DETAIL' })).toEqual({
      view: 'national',
    });
  });

  it('returns to the originating city after closing a city-map-opened detail', () => {
    const state: ExperienceState = {
      view: 'detail',
      siteId: 'yuhuatai-martyrs',
      origin: 'city-map',
      cityId: 'nanjing',
    };

    expect(transition(state, { type: 'CLOSE_DETAIL' })).toEqual({
      view: 'returning-site',
      cityId: 'nanjing',
      siteId: 'yuhuatai-martyrs',
    });
  });

  it('opens a directory detail with the directory origin recorded', () => {
    const state: ExperienceState = { view: 'national' };
    const event: ExperienceEvent = {
      type: 'OPEN_DIRECTORY_DETAIL',
      siteId: 'meiyuan-new-village',
    };

    expect(transition(state, event)).toEqual({
      view: 'detail',
      siteId: 'meiyuan-new-village',
      origin: 'directory',
      cityId: null,
    });
  });

  it('ignores CLOSE_DETAIL from any non-detail view', () => {
    const state: ExperienceState = { view: 'national' };

    expect(transition(state, { type: 'CLOSE_DETAIL' })).toBe(state);
  });

  it('ignores map events that do not match the current view', () => {
    const state: ExperienceState = {
      view: 'detail',
      siteId: 'sihang-warehouse',
      origin: 'directory',
      cityId: null,
    };

    expect(transition(state, { type: 'SELECT_SITE', siteId: 'sihang-warehouse' })).toBe(state);
    expect(transition(state, { type: 'TRAVEL_COMPLETE' })).toBe(state);
    expect(transition(state, { type: 'RETURN_COMPLETE' })).toBe(state);
  });
});
