import { describe, expect, it } from 'vitest';

import { transition, type ExperienceEvent, type ExperienceState } from './experienceState';

describe('experienceState transition', () => {
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
    });
  });

  it('ignores CLOSE_DETAIL from any non-detail view', () => {
    const state: ExperienceState = { view: 'national' };

    expect(transition(state, { type: 'CLOSE_DETAIL' })).toBe(state);
  });

  it('ignores map events that do not match the current view', () => {
    const state: ExperienceState = { view: 'detail', siteId: 'sihang-warehouse', origin: 'directory' };

    expect(transition(state, { type: 'SELECT_SITE', siteId: 'sihang-warehouse' })).toBe(state);
    expect(transition(state, { type: 'TRAVEL_COMPLETE' })).toBe(state);
    expect(transition(state, { type: 'RETURN_COMPLETE' })).toBe(state);
  });
});
