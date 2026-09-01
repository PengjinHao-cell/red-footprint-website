import type { CityId } from './cityMapConfig';

/**
 * 两级平面地图体验的显式状态机。
 *
 * 详情来源（origin）决定关闭详情后的去向：
 * - `directory`：从目录卡片直达，关闭后直接回到全国视图；
 * - `city-map`：从城市地图红星进入，关闭后回到该城市（返程动画）；
 * - `legacy-map`：旧 3D 地球路径（Task 1 保留，Task 7 移除），关闭后回到总览返程。
 */

export type ExperienceView =
  | 'welcome'
  | 'national'
  | 'entering-city'
  | 'city'
  | 'travelling-site'
  | 'detail'
  | 'returning-national'
  | 'returning-site';

export type DetailOrigin = 'directory' | 'city-map' | 'legacy-map';

export type ExperienceState =
  | { view: 'welcome' }
  | { view: 'national' }
  | { view: 'entering-city'; cityId: CityId }
  | { view: 'city'; cityId: CityId }
  | { view: 'travelling-site'; cityId: CityId; siteId: string }
  | {
      view: 'detail';
      siteId: string;
      origin: DetailOrigin;
      cityId: CityId | null;
    }
  | { view: 'returning-national'; siteId: string }
  | { view: 'returning-site'; cityId: CityId; siteId: string };

export type ExperienceEvent =
  | { type: 'OPEN_DIRECTORY_DETAIL'; siteId: string }
  | { type: 'SELECT_CITY'; cityId: CityId }
  | { type: 'CITY_ENTERED' }
  | { type: 'SELECT_SITE'; siteId: string }
  | { type: 'SITE_REACHED' }
  | { type: 'SITE_RETURNED' }
  | { type: 'BACK_TO_NATIONAL' }
  | { type: 'TRAVEL_COMPLETE' }
  | { type: 'RETURN_COMPLETE' }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'RESET_MAP' };

export const initialExperienceState: ExperienceState = { view: 'welcome' };

export function transition(
  state: ExperienceState,
  event: ExperienceEvent,
): ExperienceState {
  switch (event.type) {
    case 'OPEN_DIRECTORY_DETAIL':
      return { view: 'detail', siteId: event.siteId, origin: 'directory', cityId: null };
    case 'SELECT_CITY':
      if (state.view !== 'national') return state;
      return { view: 'entering-city', cityId: event.cityId };
    case 'CITY_ENTERED':
      if (state.view !== 'entering-city' || !state.cityId) return state;
      return { view: 'city', cityId: state.cityId };
    case 'SELECT_SITE':
      if (state.view !== 'city' || !state.cityId) return state;
      return {
        view: 'travelling-site',
        cityId: state.cityId,
        siteId: event.siteId,
      };
    case 'SITE_REACHED':
      if (state.view !== 'travelling-site' || !state.cityId || !state.siteId) return state;
      return {
        view: 'detail',
        cityId: state.cityId,
        siteId: state.siteId,
        origin: 'city-map',
      };
    case 'SITE_RETURNED':
      if (state.view !== 'returning-site' || !state.cityId) return state;
      return { view: 'city', cityId: state.cityId };
    case 'BACK_TO_NATIONAL':
      if (state.view !== 'city') return state;
      return { view: 'national' };
    case 'TRAVEL_COMPLETE':
      if (state.view !== 'travelling-site') return state;
      return { view: 'detail', siteId: state.siteId, origin: 'legacy-map', cityId: null };
    case 'RETURN_COMPLETE':
      if (state.view !== 'returning-national') return state;
      return { view: 'national' };
    case 'CLOSE_DETAIL':
      if (state.view !== 'detail') return state;
      if (state.origin === 'directory') return { view: 'national' };
      if (state.origin === 'legacy-map') {
        return { view: 'returning-national', siteId: state.siteId };
      }
      if (!state.cityId) return { view: 'national' };
      return {
        view: 'returning-site',
        cityId: state.cityId,
        siteId: state.siteId,
      };
    case 'RESET_MAP':
      return { view: 'national' };
    default:
      return state;
  }
}
