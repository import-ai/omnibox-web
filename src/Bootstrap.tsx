import './i18n';
import './index.css';

import { createRoot } from 'react-dom/client';

import App, { type AppProps } from '@/App';
import { bindKeyboardDebug } from '@/lib/keyboardDebug';
import { bindVisualViewport } from '@/lib/visualViewport';

export function mountApp(element: HTMLElement, props: AppProps = {}) {
  bindVisualViewport();
  bindKeyboardDebug();
  const root = createRoot(element);
  root.render(<App {...props} />);
  return root;
}
