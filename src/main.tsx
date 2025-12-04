import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';
import { patchDOMForGoogleTranslate } from './lib/patch-dom-for-google-translate';

// Apply DOM patch to fix Google Translate conflicts with React
patchDOMForGoogleTranslate();

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
