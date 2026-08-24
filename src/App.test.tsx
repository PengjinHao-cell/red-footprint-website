import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { siteSchema, type Site } from './data/siteSchema';
import { validEightSites } from './test/fixtures/sites';
import App from './App';

const globeHarness = vi.hoisted(() => ({
  fallback: false,
  mounts: 0,
  shouldThrow: false,
}));

vi.mock('./components/globe/GlobeScene', async () => {
  const React = await import('react');

  type MockGlobeProps = {
    sites: ReadonlyArray<Site>;
    selectedId: string | null;
    detailOpen: boolean;
    onReady: () => void;
    onError: (error: Error) => void;
    onSelect: (id: string) => void;
    onTravelComplete: (id: string) => void;
    onReturnComplete: () => void;
  };

  function MockGlobeScene({
    sites,
    selectedId,
    detailOpen,
    onReady,
    onError,
    onSelect,
    onTravelComplete,
    onReturnComplete,
  }: MockGlobeProps) {
    React.useEffect(() => {
      globeHarness.mounts += 1;
      if (globeHarness.fallback) {
        onError(new Error('synthetic compliance fallback'));
      } else {
        onReady();
      }
    }, [onError, onReady]);

    if (globeHarness.shouldThrow) {
      throw new Error('synthetic globe render failure');
    }

    const chooseSite = (id: string) => {
      onSelect(id);
      if (globeHarness.fallback) {
        queueMicrotask(() => onTravelComplete(id));
      }
    };

    return (
      <section aria-label={globeHarness.fallback ? '景点列表降级' : '测试三维地图'}>
        {sites.map((site) => (
          <button
            disabled={selectedId !== null && !detailOpen}
            key={site.id}
            onClick={() => chooseSite(site.id)}
            type="button"
          >
            {site.officialName}
          </button>
        ))}
        {!globeHarness.fallback && selectedId && !detailOpen && (
          <button
            onClick={() => onTravelComplete(selectedId)}
            type="button"
          >
            完成镜头飞行
          </button>
        )}
        {selectedId && !detailOpen && (
          <button onClick={onReturnComplete} type="button">
            完成返回总览
          </button>
        )}
      </section>
    );
  }

  return { default: MockGlobeScene };
});

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

async function waitForMap() {
  await waitFor(
    () =>
      expect(
        screen.queryByRole('region', { name: '测试三维地图' }),
      ).toBeVisible(),
    { timeout: 4_000 },
  );
}

async function openFirstSiteFromMap() {
  await waitForMap();
  fireEvent.click(screen.getByRole('button', { name: sites[0].officialName }));
  expect(screen.getByRole('status')).toHaveTextContent('正在调整地图视角');
  fireEvent.click(screen.getByRole('button', { name: '完成镜头飞行' }));
  await screen.findByRole('dialog', { name: sites[0].officialName });
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
    () => undefined,
  );
  globeHarness.fallback = false;
  globeHarness.mounts = 0;
  globeHarness.shouldThrow = false;
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('App', () => {
  it('boots the production app with generated sites instead of a test fixture', () => {
    const mainSource = readFileSync(join(process.cwd(), 'src/main.tsx'), 'utf8');

    expect(existsSync(productionSitesPath)).toBe(true);
    expect(mainSource).toMatch(/from ['"]\.\/data\/sites\.json['"]/);
    expect(mainSource).toMatch(/loadSites\(/);
    expect(mainSource).toMatch(/<App sites=\{sites\}/);
    expect(mainSource).not.toMatch(/test\/fixtures|syntheticSites|validEightSites/);
  });

  it('keeps the approved title and shows a safe gate when production sites are absent', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '青春寻访·红色足迹',
      }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '内容资料尚未通过发布门禁',
    );
    expect(screen.queryByRole('button', { name: '开启寻访' })).not.toBeInTheDocument();
  });

  it('moves from the existing welcome screen to the map when modules are ready', async () => {
    render(<App sites={sites} />);

    expect(screen.getByRole('button', { name: '开启寻访' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '开启寻访' }));

    await waitForMap();
    expect(screen.getByText('已点亮 0 / 8 处红色坐标')).toBeVisible();
  });

  it('travels to a point, opens its detail, and records the visit only on open', async () => {
    renderExperience();
    await waitForMap();

    fireEvent.click(screen.getByRole('button', { name: sites[0].officialName }));

    expect(screen.getByRole('status')).toHaveTextContent('正在调整地图视角');
    expect(screen.getByText('已点亮 0 / 8 处红色坐标')).toBeVisible();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '完成镜头飞行' }));

    expect(
      await screen.findByRole('dialog', { name: sites[0].officialName }),
    ).toBeVisible();
    expect(screen.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      sites[0].id,
    ]);
  });

  it('ignores another point while travelling', async () => {
    renderExperience();
    await waitForMap();

    fireEvent.click(screen.getByRole('button', { name: sites[0].officialName }));

    expect(screen.getByRole('button', { name: sites[1].officialName })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: sites[1].officialName }));
    fireEvent.click(screen.getByRole('button', { name: '完成镜头飞行' }));

    expect(screen.getByRole('dialog', { name: sites[0].officialName })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: sites[1].officialName })).not.toBeInTheDocument();
  });

  it('closes detail, waits for the overview return, then restores the map', async () => {
    renderExperience();
    await openFirstSiteFromMap();

    fireEvent.click(screen.getByRole('button', { name: '关闭景点详情' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('正在调整地图视角');
    expect(screen.getByRole('button', { name: sites[1].officialName })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '完成返回总览' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: sites[1].officialName })).toBeEnabled();
  });

  it('opens the same detail and records progress through the fallback list', async () => {
    globeHarness.fallback = true;
    renderExperience();

    expect(screen.getByRole('region', { name: '景点列表降级' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^查看/ })).toHaveLength(8);

    fireEvent.click(screen.getByRole('button', { name: sites[0].officialName }));
    expect(screen.getByRole('status')).toHaveTextContent('正在调整地图视角');
    expect(screen.getByText('已点亮 0 / 8 处红色坐标')).toBeVisible();

    expect(
      await screen.findByRole('dialog', { name: sites[0].officialName }),
    ).toBeVisible();
    expect(screen.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
  });

  it('retries only the 3D subtree without a page reload or progress loss', async () => {
    globeHarness.fallback = true;
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderExperience();

    fireEvent.click(screen.getByRole('button', { name: sites[0].officialName }));
    await screen.findByRole('dialog', { name: sites[0].officialName });
    fireEvent.click(screen.getByRole('button', { name: '关闭景点详情' }));
    fireEvent.click(screen.getByRole('button', { name: '完成返回总览' }));
    const mountsBeforeRetry = globeHarness.mounts;

    fireEvent.click(screen.getByRole('button', { name: '重新加载3D地图' }));

    await waitFor(() => expect(globeHarness.mounts).toBe(mountsBeforeRetry + 1));
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      sites[0].id,
    ]);
  });

  it('does not bypass a compliance fallback after retrying the 3D subtree', () => {
    globeHarness.fallback = true;
    renderExperience();

    expect(screen.getByRole('region', { name: '景点列表降级' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^查看/ })).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: '重新加载3D地图' }));

    expect(screen.getByRole('region', { name: '景点列表降级' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^查看/ })).toHaveLength(8);
  });

  it('opens detail directly from a directory card without a camera flight', async () => {
    renderExperience();
    await waitForMap();

    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`查看${sites[0].officialName}`),
      }),
    );

    expect(screen.queryByText(/正在调整地图视角/)).not.toBeInTheDocument();
    expect(
      await screen.findByRole('dialog', { name: sites[0].officialName }),
    ).toBeVisible();
    expect(screen.getByText('已点亮 1 / 8 处红色坐标')).toBeVisible();
  });

  it('recovers a rendering failure by remounting the map subtree', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    globeHarness.shouldThrow = true;
    renderExperience();

    expect(await screen.findByRole('alert')).toHaveTextContent('地图体验暂时无法显示');
    globeHarness.shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: '重新尝试' }));

    await waitForMap();
    expect(consoleError).toHaveBeenCalled();
  });
});
