import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

console.log('当前 OmniBox 版本：', import.meta.env.VITE_APP_VERSION);
