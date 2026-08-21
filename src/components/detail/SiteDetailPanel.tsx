import { useEffect, useId, useRef } from 'react';

import type { Site } from '../../data/siteSchema';
import { buildMediaItems } from '../../lib/media';
import MediaCarousel from './MediaCarousel';
import SiteHero from './SiteHero';

type SiteDetailPanelProps = {
  site: Site;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
};

type NarrativeSectionProps = {
  title: string;
  children: string;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'video[controls]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function NarrativeSection({ title, children }: NarrativeSectionProps) {
  if (!children.trim()) {
    return null;
  }

  return (
    <section className="site-detail__section">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export default function SiteDetailPanel({
  site,
  onClose,
  returnFocusTo,
}: SiteDetailPanelProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const mediaItems = buildMediaItems(site);

  useEffect(() => {
    closeButtonRef.current?.focus();

    return () => {
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  const requestClose = () => {
    returnFocusTo?.focus();
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ??
        [],
    );
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const activeElement = document.activeElement;
    if (
      event.shiftKey &&
      (activeElement === first || !dialogRef.current?.contains(activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (activeElement === last || !dialogRef.current?.contains(activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="site-detail-backdrop">
      <article
        aria-labelledby={titleId}
        aria-modal="true"
        className="site-detail"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="关闭景点详情"
          className="site-detail__close"
          onClick={requestClose}
          ref={closeButtonRef}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>

        <SiteHero site={site} titleId={titleId} />
        <MediaCarousel items={mediaItems} />

        <div className="site-detail__content">
          <section className="site-detail__section site-detail__section--basic">
            <h2>基础信息</h2>
            <dl className="site-detail__facts">
              <div>
                <dt>正式名称</dt>
                <dd>{site.officialName}</dd>
              </div>
              <div>
                <dt>地址</dt>
                <dd>{site.address}</dd>
              </div>
              <div>
                <dt>开放时间</dt>
                <dd>{site.opening}</dd>
              </div>
              <div>
                <dt>预约方式</dt>
                <dd>{site.reservation}</dd>
              </div>
              <div>
                <dt>参观提示</dt>
                <dd>{site.visitNotice}</dd>
              </div>
              <div>
                <dt>官方称号</dt>
                <dd>{site.officialTitle}</dd>
              </div>
            </dl>
          </section>

          <NarrativeSection title="历史印记">{site.history}</NarrativeSection>
          <NarrativeSection title="人物故事">{site.people}</NarrativeSection>
          <NarrativeSection title="精神传承">{site.spirit}</NarrativeSection>
          <NarrativeSection title="寻访感悟">
            {site.reflection}
          </NarrativeSection>

          <section className="site-detail__section site-detail__sources">
            <h2>资料来源</h2>
            <ul>
              {site.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url}>{source.label}</a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </div>
  );
}
