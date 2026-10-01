// Official shadcn base colors plus the product palette.
export const colorThemes = [
  {
    name: 'omnibox',
    labelKey: 'manage.color_theme_omnibox',
    swatch: 'hsl(234 100% 66%)',
  },
  {
    name: 'neutral',
    labelKey: 'manage.color_theme_neutral',
    swatch: 'oklch(0.556 0 0)',
  },
  {
    name: 'stone',
    labelKey: 'manage.color_theme_stone',
    swatch: 'oklch(0.553 0.013 58.071)',
  },
  {
    name: 'zinc',
    labelKey: 'manage.color_theme_zinc',
    swatch: 'oklch(0.552 0.016 285.938)',
  },
  {
    name: 'mauve',
    labelKey: 'manage.color_theme_mauve',
    swatch: 'oklch(0.542 0.034 322.5)',
  },
  {
    name: 'olive',
    labelKey: 'manage.color_theme_olive',
    swatch: 'oklch(0.58 0.031 107.3)',
  },
  {
    name: 'mist',
    labelKey: 'manage.color_theme_mist',
    swatch: 'oklch(0.56 0.021 213.5)',
  },
  {
    name: 'taupe',
    labelKey: 'manage.color_theme_taupe',
    swatch: 'oklch(0.547 0.021 43.1)',
  },
] as const;

export type ColorThemeName = (typeof colorThemes)[number]['name'];

export function resolveColorTheme(value: unknown): ColorThemeName {
  return (
    colorThemes.find(theme => theme.name === value)?.name ??
    (typeof value === 'string' &&
    [
      'amber',
      'blue',
      'cyan',
      'emerald',
      'fuchsia',
      'green',
      'indigo',
      'lime',
      'orange',
      'pink',
      'purple',
      'red',
      'rose',
      'sky',
      'teal',
      'violet',
      'yellow',
    ].includes(value)
      ? 'neutral'
      : 'omnibox')
  );
}
