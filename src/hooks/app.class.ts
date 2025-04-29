import { Theme } from '@/interface';
import Hook from '@/hooks/hook.class';

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
    this.theme.skin = state;
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

  toggleTheme(): Theme {
    const theme = this.applyTheme(
      this.theme.skin === 'dark' ? 'light' : 'dark',
    );
    localStorage.setItem('theme', JSON.stringify(this.theme));
    return theme;
  }
}
