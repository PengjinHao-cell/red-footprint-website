import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '../../../src/App';
import { loadSites } from '../../../src/data/loadSites';
import '../../../src/styles/tokens.css';
import '../../../src/styles/global.css';
import { syntheticSites } from '../fixtures/sites';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('E2E harness root element was not found');
}

const sites = loadSites(syntheticSites);

createRoot(rootElement).render(
  <StrictMode>
    <aside
      aria-label="TEST-ONLY 标识"
      style={{
        position: 'fixed',
        zIndex: 1000,
        inset: '0 auto auto 0',
        padding: '0.3rem 0.55rem',
        background: '#fff200',
        color: '#111',
        font: '700 12px/1.2 sans-serif',
      }}
    >
      TEST-ONLY · 八条合成地点 · 禁止生产使用
    </aside>
    <App sites={sites} />
  </StrictMode>,
);
