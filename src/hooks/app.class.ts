import Hook from '@/hooks/hook.class';
import { Theme } from '@/interface';

const defaultTheme: Theme = {
  skin: 'system',
  content: 'light',
  code: 'github',
};

export default class App extends Hook {
  public theme = defaultTheme;

  constructor() {
    super();
    const cache = localStorage.getItem('theme');
    if (cache) {
      this.theme = JSON.parse(cache);
    }
    this.applyTheme(this.theme.skin);
  }

  applyTheme(skin: 'light' | 'system' | 'dark') {
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
    return this.theme;
  }

  getTheme() {
    return this.theme;
  }

  toggleTheme(skin?: 'light' | 'system' | 'dark'): Theme {
    let skinArgs: 'light' | 'system' | 'dark' = 'light';
    if (skin) {
      skinArgs = skin;
    } else {
      const themeOptions = ['system', 'light', 'dark'];
      const index = themeOptions.indexOf(this.theme.skin);
      skinArgs = themeOptions[(index + 1) % themeOptions.length] as
        | 'light'
        | 'system'
        | 'dark';
    }
    const theme = this.applyTheme(skinArgs);
    localStorage.setItem('theme', JSON.stringify(theme));
    return theme;
  }
}
