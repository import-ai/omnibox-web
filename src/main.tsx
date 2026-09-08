import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';

// Keep the app sized to the visible viewport when browser chrome or the
// on-screen keyboard changes its height.
const setViewportHeight = () => {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty(
    '--app-height',
    `${viewportHeight}px`
  );
};
setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);
window.visualViewport?.addEventListener('resize', setViewportHeight);
window.visualViewport?.addEventListener('scroll', setViewportHeight);

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
