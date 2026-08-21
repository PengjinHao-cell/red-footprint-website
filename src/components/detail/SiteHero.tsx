import type { Site } from '../../data/siteSchema';

type SiteHeroProps = {
  site: Site;
  titleId: string;
};

export default function SiteHero({ site, titleId }: SiteHeroProps) {
  return (
    <header className="site-hero" data-testid="site-hero">
      <img
        alt=""
        aria-hidden="true"
        className="site-hero__image"
        data-testid="site-hero-image"
        decoding="async"
        src={site.heroImage}
        style={{
          objectPosition: `${site.heroFocus.x}% ${site.heroFocus.y}%`,
        }}
      />
      <div className="site-hero__overlay">
        <p className="site-hero__location">
          {site.province} · {site.city}
        </p>
        <h1 id={titleId}>{site.officialName}</h1>
        <p className="site-hero__title">{site.officialTitle}</p>
      </div>
    </header>
  );
}
