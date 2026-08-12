import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';

// crypto.randomUUID is secure-context only. LAN IP previews like
// http://192.168.x.x hit non-secure contexts and crash editor deps.
if (
  typeof globalThis.crypto !== 'undefined' &&
  typeof globalThis.crypto.randomUUID !== 'function'
) {
  globalThis.crypto.randomUUID = function randomUUID() {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(
      ''
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}

// Safari mobile viewport height adaptation
const setViewportHeight = () => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone) {
    document.documentElement.style.setProperty('--vh', '1vh');
  } else {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
};
setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
