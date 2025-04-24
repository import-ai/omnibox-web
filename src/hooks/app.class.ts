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
    this.applyTheme();
  }

  applyTheme() {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    let className = this.theme.skin;
    if (className === 'system') {
      className = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    root.classList.add(className);
  }

  getTheme() {
    return this.theme;
  }

  toggleTheme(): Theme {
    let state: Theme['skin'] = this.theme.skin === 'dark' ? 'light' : 'dark';
    if (this.theme.skin === 'system') {
      state = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'light'
        : 'dark';
    }
    this.theme.skin = state;
    this.theme.content = state;
    this.theme.code = state === 'dark' ? 'github-dark' : 'github';
    localStorage.setItem('theme', JSON.stringify(this.theme));
    this.applyTheme();
    return this.theme;
  }
}
