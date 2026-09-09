import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import { bindKeyboardDebug } from '@/lib/keyboardDebug';
import { bindVisualViewport } from '@/lib/visualViewport';

import App from './App';

// Pin the app shell to the visible viewport while the keyboard is up
// (`interactive-widget=resizes-visual`), and interpolate back to rest on dismiss.
bindVisualViewport();
bindKeyboardDebug();

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
