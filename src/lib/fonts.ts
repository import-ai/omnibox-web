const fallback = 'ui-sans-serif, system-ui, sans-serif';

export const fonts = [
  { name: 'system', label: 'System default', family: fallback },
  { name: 'inter', label: 'Inter', family: `"Inter Variable", ${fallback}` },
  { name: 'geist', label: 'Geist', family: `"Geist Variable", ${fallback}` },
  { name: 'roboto', label: 'Roboto', family: `"Roboto Variable", ${fallback}` },
] as const;

export type FontName = (typeof fonts)[number]['name'];

export function resolveFont(value: unknown): FontName {
  return fonts.find(font => font.name === value)?.name ?? 'system';
}
