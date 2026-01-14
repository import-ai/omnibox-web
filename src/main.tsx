import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';

// Set PWA application name according to language
const setPWATitle = () => {
  const lang = localStorage.getItem('i18nextLng') || navigator.language;
  const isZh = lang.toLowerCase().startsWith('zh');
  const appName = isZh ? '小黑' : 'OmniBox';

  // 设置 apple-mobile-web-app-title
  const metaTitle = document.querySelector(
    'meta[name="apple-mobile-web-app-title"]'
  );
  if (metaTitle) {
    metaTitle.setAttribute('content', appName);
  }

  // Set page title
  document.title = appName;
};
setPWATitle();

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
