import Hook from '@/hooks/hook.class';
import { Theme } from '@/interface';
import { resolveColorTheme } from '@/lib/colorThemes';
import { fonts, resolveFont } from '@/lib/fonts';

const defaultTheme: Theme = {
  colorTheme: 'omnibox',
  font: 'system',
  skin: 'system',
  content: 'light',
  code: 'github',
};

export default class App extends Hook {
  public theme = { ...defaultTheme };

  constructor() {
    super();
    const cache = localStorage.getItem('theme');
    if (cache) {
      try {
        const stored: Theme = JSON.parse(cache);
        this.theme = { ...defaultTheme, ...stored };
      } catch {
        // Ignore invalid cached preferences and use the defaults.
      }
    }
    this.applyTheme(this.theme.skin);

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.theme.skin === 'system') {
          this.applyTheme('system');
          this.fire('theme-toggle', { ...this.theme });
        }
      });
  }

  applyTheme(skin: 'light' | 'system' | 'dark') {
    this.theme.font = resolveFont(this.theme.font);
    document.documentElement.style.setProperty(
      '--app-font',
      fonts.find(font => font.name === this.theme.font)!.family
    );
    document.documentElement.dataset.font = this.theme.font;
    this.theme.colorTheme = resolveColorTheme(this.theme.colorTheme);
    document.documentElement.dataset.colorTheme = this.theme.colorTheme;
    let state = skin;
    if (skin === 'system') {
      state = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    this.theme.skin = skin;
    // @ts-ignore
    this.theme.content = state;
    this.theme.code = state === 'dark' ? 'github-dark' : 'github';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(state);

    // Set color-scheme for native UI components (file picker, scrollbars, etc.)
    document.documentElement.style.colorScheme = state;

    // Update meta theme-color for PWA status bar
    const themeColor = state === 'dark' ? '#262626' : '#ffffff';
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.setAttribute('content', themeColor);
    });

    return this.theme;
  }

  getTheme() {
    return this.theme;
  }

  toggleTheme(
    skin?: 'light' | 'system' | 'dark',
    colorTheme?: string,
    font?: string
  ): Theme {
    if (font !== undefined) this.theme.font = resolveFont(font);
    if (colorTheme !== undefined) {
      this.theme.colorTheme = resolveColorTheme(colorTheme);
    }
    let skinArgs: 'light' | 'system' | 'dark' = 'light';
    if (skin) {
      skinArgs = skin;
    } else {
      const themeOptions = ['system', 'light', 'dark'];
      const index = themeOptions.indexOf(this.theme.skin);
      skinArgs = themeOptions[(index + 1) % themeOptions.length] as
        'light' | 'system' | 'dark';
    }
    const theme = this.applyTheme(skinArgs);
    localStorage.setItem('theme', JSON.stringify(theme));
    return theme;
  }
}
