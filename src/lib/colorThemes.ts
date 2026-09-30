// Names and swatches from the official shadcn theme registry.
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
  {
    name: 'amber',
    labelKey: 'manage.color_theme_amber',
    swatch: 'oklch(0.555 0.163 48.998)',
  },
  {
    name: 'blue',
    labelKey: 'manage.color_theme_blue',
    swatch: 'oklch(0.488 0.243 264.376)',
  },
  {
    name: 'cyan',
    labelKey: 'manage.color_theme_cyan',
    swatch: 'oklch(0.52 0.105 223.128)',
  },
  {
    name: 'emerald',
    labelKey: 'manage.color_theme_emerald',
    swatch: 'oklch(0.508 0.118 165.612)',
  },
  {
    name: 'fuchsia',
    labelKey: 'manage.color_theme_fuchsia',
    swatch: 'oklch(0.518 0.253 323.949)',
  },
  {
    name: 'green',
    labelKey: 'manage.color_theme_green',
    swatch: 'oklch(0.527 0.154 150.069)',
  },
  {
    name: 'indigo',
    labelKey: 'manage.color_theme_indigo',
    swatch: 'oklch(0.457 0.24 277.023)',
  },
  {
    name: 'lime',
    labelKey: 'manage.color_theme_lime',
    swatch: 'oklch(0.841 0.238 128.85)',
  },
  {
    name: 'orange',
    labelKey: 'manage.color_theme_orange',
    swatch: 'oklch(0.553 0.195 38.402)',
  },
  {
    name: 'pink',
    labelKey: 'manage.color_theme_pink',
    swatch: 'oklch(0.525 0.223 3.958)',
  },
  {
    name: 'purple',
    labelKey: 'manage.color_theme_purple',
    swatch: 'oklch(0.496 0.265 301.924)',
  },
  {
    name: 'red',
    labelKey: 'manage.color_theme_red',
    swatch: 'oklch(0.505 0.213 27.518)',
  },
  {
    name: 'rose',
    labelKey: 'manage.color_theme_rose',
    swatch: 'oklch(0.514 0.222 16.935)',
  },
  {
    name: 'sky',
    labelKey: 'manage.color_theme_sky',
    swatch: 'oklch(0.5 0.134 242.749)',
  },
  {
    name: 'teal',
    labelKey: 'manage.color_theme_teal',
    swatch: 'oklch(0.511 0.096 186.391)',
  },
  {
    name: 'violet',
    labelKey: 'manage.color_theme_violet',
    swatch: 'oklch(0.491 0.27 292.581)',
  },
  {
    name: 'yellow',
    labelKey: 'manage.color_theme_yellow',
    swatch: 'oklch(0.852 0.199 91.936)',
  },
] as const;

export type ColorThemeName = (typeof colorThemes)[number]['name'];

export function resolveColorTheme(value: unknown): ColorThemeName {
  return colorThemes.find(theme => theme.name === value)?.name ?? 'omnibox';
}
