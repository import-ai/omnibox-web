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
  app.toggleTheme('dark', 'blue');
  const restored = new App();
  expect(restored.getTheme()).toMatchObject({
    skin: 'dark',
    colorTheme: 'blue',
  });
  restored.toggleTheme('light');
  expect(document.documentElement.dataset.colorTheme).toBe('blue');
  expect(document.documentElement.classList.contains('light')).toBe(true);
  expect(JSON.parse(localStorage.getItem('theme')!)).toMatchObject({
    skin: 'light',
    colorTheme: 'blue',
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
])('falls back to Neutral for old or invalid saved palettes: %s', cache => {
  localStorage.setItem('theme', cache);
  const app = new App();
  expect(app.getTheme().colorTheme).toBe('neutral');
  expect(document.documentElement.dataset.colorTheme).toBe('neutral');
});
