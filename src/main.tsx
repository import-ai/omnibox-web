import { mountApp } from './Bootstrap';

mountApp(document.getElementById('root')!);

if (import.meta.env.MODE === 'development') {
  console.log({ version: import.meta.env.VITE_APP_VERSION });
}
