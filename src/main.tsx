import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { loadSites } from './data/loadSites';
import sitesData from './data/sites.json';
import './styles/tokens.css';
import './styles/global.css';

const sites = loadSites(sitesData);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App sites={sites} />
  </StrictMode>,
);
