import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { siteSchema } from './data/siteSchema';
import { validEightSites } from './test/fixtures/sites';

const productionSitesPath = join(process.cwd(), 'src/data/sites.json');
const siteInput = existsSync(productionSitesPath)
  ? JSON.parse(readFileSync(productionSitesPath, 'utf8'))
  : validEightSites;
const sites = siteSchema.array().parse(siteInput);
const STORAGE_KEY = 'red-footprint:visited:v1';

function renderExperience() {
  render(<App sites={sites} />);
  fireEvent.click(screen.getByRole('button', { name: '开启寻访' }));
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: true,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('App', () => {
  it('boots from generated production sites and keeps the safe empty-data gate', () => {
    const mainSource = readFileSync(join(process.cwd(), 'src/main.tsx'), 'utf8');
    expect(existsSync(productionSitesPath)).toBe(true);
    expect(mainSource).toMatch(/from ['"]\.\/data\/sites\.json['"]/);

    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('内容资料尚未通过发布门禁');
  });

  it('completes the two-level city journey and records a visit only at detail', async () => {
    renderExperience();
    expect(screen.getByRole('region', { name: '选择城市' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '进入南京市' }));
    expect(await screen.findByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
    expect(screen.getByText('已点亮 0 / 8 处红色坐标')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '雨花台烈士陵园' }));
    expect(await screen.findByRole('dialog', { name: '雨花台烈士陵园' })).toBeVisible();
    expect(screen.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['yuhuatai-martyrs']);
  });

  it('returns from a city-opened detail to the same city without a stuck status', async () => {
    renderExperience();
    fireEvent.click(screen.getByRole('button', { name: '进入南京市' }));
    await screen.findByRole('region', { name: '南京市红色足迹地图' });
    fireEvent.click(screen.getByRole('button', { name: '雨花台烈士陵园' }));
    await screen.findByRole('dialog', { name: '雨花台烈士陵园' });
    fireEvent.click(screen.getByRole('button', { name: '关闭景点详情' }));

    expect(await screen.findByRole('region', { name: '南京市红色足迹地图' })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('opens a directory card directly and closes back to the national map', async () => {
    renderExperience();
    fireEvent.click(screen.getByRole('button', { name: /查看上海四行仓库抗战纪念馆/ }));
    expect(await screen.findByRole('dialog', { name: '上海四行仓库抗战纪念馆' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '关闭景点详情' }));

    expect(screen.getByRole('region', { name: '选择城市' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('returns from a city map to the national map', async () => {
    renderExperience();
    fireEvent.click(screen.getByRole('button', { name: '进入上海市' }));
    await screen.findByRole('region', { name: '上海市红色足迹地图' });
    fireEvent.click(screen.getByRole('button', { name: '返回全国地图' }));
    expect(screen.getByRole('region', { name: '选择城市' })).toBeVisible();
  });
});
