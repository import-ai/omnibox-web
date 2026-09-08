import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import { bindVisualViewport } from '@/lib/visualViewport';

import App from './App';

// Pin the app shell to the visual viewport so iOS Safari/WebView keyboard
// pan does not leave a blank gap below the composer.
bindVisualViewport();

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
