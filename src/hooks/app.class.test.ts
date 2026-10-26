/** @jest-environment jsdom */
import App from './app.class';

jest.mock('@/hooks/hook.class', () => ({
  __esModule: true,
  default: class {
    fire = jest.fn();
  },
}));

let systemChange: () => void;
let systemDark = false;

beforeEach(() => {
  localStorage.clear();
  systemDark = false;
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: systemDark,
    addEventListener: (_event: string, listener: () => void) => {
      systemChange = listener;
    },
  }));
});

it('restores the palette and keeps it when appearance changes', () => {
  const app = new App();
  app.toggleTheme('dark', 'zinc');
  const restored = new App();
  expect(restored.getTheme()).toMatchObject({
    skin: 'dark',
    colorTheme: 'zinc',
  });
  restored.toggleTheme('light');
  expect(document.documentElement.dataset.colorTheme).toBe('zinc');
  expect(document.documentElement.classList.contains('light')).toBe(true);
  expect(JSON.parse(localStorage.getItem('theme')!)).toMatchObject({
    skin: 'light',
    colorTheme: 'zinc',
  });
});

it('keeps the palette when system appearance changes', () => {
  const app = new App();
  app.toggleTheme('system', 'stone');
  systemDark = true;
  systemChange();
  expect(app.getTheme()).toMatchObject({
    skin: 'system',
    content: 'dark',
    colorTheme: 'stone',
  });
  expect(document.documentElement.dataset.colorTheme).toBe('stone');
});

it.each([
  '{bad json',
  '{"skin":"light"}',
  '{"skin":"light","colorTheme":"unknown"}',
])('falls back to OmniBox for old or invalid saved palettes: %s', cache => {
  localStorage.setItem('theme', cache);
  const app = new App();
  expect(app.getTheme().colorTheme).toBe('omnibox');
  expect(document.documentElement.dataset.colorTheme).toBe('omnibox');
});

it('restores fonts and keeps them when appearance or base color changes', () => {
  const app = new App();
  app.toggleTheme('dark', 'stone', 'inter');
  const restored = new App();
  restored.toggleTheme('light', 'zinc');
  expect(restored.getTheme().font).toBe('inter');
  expect(
    document.documentElement.style.getPropertyValue('--app-font')
  ).toContain('Inter Variable');
  expect(document.documentElement.dataset.font).toBe('inter');
  expect(JSON.parse(localStorage.getItem('theme')!).font).toBe('inter');
});

it('migrates removed accent themes to Neutral and rejects unknown fonts', () => {
  localStorage.setItem(
    'theme',
    JSON.stringify({ skin: 'light', colorTheme: 'blue', font: 'unknown' })
  );
  const app = new App();
  expect(app.getTheme()).toMatchObject({
    colorTheme: 'neutral',
    font: 'system',
  });
  expect(document.documentElement.dataset.colorTheme).toBe('neutral');
  expect(document.documentElement.style.getPropertyValue('--app-font')).toBe(
    'ui-sans-serif, system-ui, sans-serif'
  );
});
