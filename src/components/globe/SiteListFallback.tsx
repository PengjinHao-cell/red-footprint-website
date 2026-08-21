import type { Site } from '../../data/siteSchema';

const MAX_SITES = 8;

type SiteListFallbackProps = {
  sites: ReadonlyArray<Site>;
  onSelect: (id: string) => void;
};

export default function SiteListFallback({
  sites,
  onSelect,
}: SiteListFallbackProps) {
  return (
    <section
      aria-labelledby="site-list-fallback-title"
      style={{
        width: 'min(100%, 48rem)',
        margin: '0 auto',
        padding: 'clamp(1.25rem, 4vw, 2.5rem)',
        border: '1px solid #e7d4b5',
        borderRadius: '1rem',
        background: '#fbf7ee',
        color: '#3f2925',
      }}
    >
      <h2
        id="site-list-fallback-title"
        style={{ margin: '0 0 0.5rem', color: '#54201d' }}
      >
        红色足迹景点列表
      </h2>
      <p style={{ margin: '0 0 1rem', lineHeight: 1.7 }}>
        三维地图当前不可用，仍可从列表继续浏览全部景点。
      </p>
      <ol
        style={{
          display: 'grid',
          gap: '0.75rem',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {sites.slice(0, MAX_SITES).map((site) => (
          <li key={site.id}>
            <button
              onClick={() => onSelect(site.id)}
              style={{
                width: '100%',
                minHeight: '3rem',
                padding: '0.75rem 1rem',
                border: '1px solid #982e2d',
                borderRadius: '0.75rem',
                background: '#fbf7ee',
                color: '#54201d',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              type="button"
            >
              {site.officialName}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
