import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
