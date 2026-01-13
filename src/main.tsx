import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';

// Safari mobile viewport height adaptation
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};
setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
