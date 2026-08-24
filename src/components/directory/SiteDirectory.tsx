import { useState } from 'react';

import type { Site } from '../../data/siteSchema';
import { sortSitesForDirectory } from './siteDirectoryOrder';

type SiteDirectoryProps = {
  sites: ReadonlyArray<Site>;
  visitedIds: ReadonlyArray<string>;
  onOpen: (id: string) => void;
};

/**
 * 地图下方的八地点"左图右文"名片目录。
 * 卡片直接打开详情,不触发地球镜头飞行;名称完整换行,不使用省略号截断。
 */
export default function SiteDirectory({
  sites,
  visitedIds,
  onOpen,
}: SiteDirectoryProps) {
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const visitedSet = new Set(visitedIds);
  const orderedSites = sortSitesForDirectory(sites);

  const handleImageError = (id: string) => {
    setFailedImages((current) => {
      if (current.has(id)) {
        return current;
      }
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  return (
    <section aria-label="红色地标名录" className="site-directory">
      <h2 className="site-directory__heading">红色地标名录</h2>
      <div className="site-directory__grid">
        {orderedSites.map((site) => (
          <button
            aria-label={`查看${site.officialName}`}
            className="site-directory__card"
            key={site.id}
            onClick={() => onOpen(site.id)}
            type="button"
          >
            {failedImages.has(site.id) ? (
              <span
                aria-label={`${site.officialName}代表图片加载失败`}
                className="site-directory__card-image site-directory__card-image--failure"
                role="img"
              >
                图片加载失败
              </span>
            ) : (
              <img
                alt={`${site.officialName}代表图片`}
                className="site-directory__card-image"
                decoding="async"
                loading="lazy"
                onError={() => handleImageError(site.id)}
                src={site.heroImage}
              />
            )}
            <span className="site-directory__card-body">
              <span className="site-directory__card-city">{site.city}</span>
              <span className="site-directory__card-title">
                {site.officialName}
              </span>
              <span className="site-directory__card-action">查看红色足迹</span>
              {visitedSet.has(site.id) && (
                <span className="site-directory__card-visited">已点亮</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
