export const shortcutLabels = {
  bold: 'Mod+B',
  bulletList: 'Mod+Shift+8',
  codeBlock: 'Mod+Shift+C',
  heading: 'Mod+Alt+2',
  inlineCode: 'Mod+E',
  italic: 'Mod+I',
  horizontalRule: 'Mod+Shift+H',
  insertAfter: 'Mod+Alt+ArrowDown',
  insertBefore: 'Mod+Alt+ArrowUp',
  instantRenderMode: 'Mod+Alt+8',
  link: 'Mod+Shift+K',
  orderedList: 'Mod+Shift+7',
  quote: 'Mod+;',
  redo: 'Mod+Shift+Z',
  splitPreviewMode: 'Mod+Alt+9',
  strike: 'Mod+Shift+S',
  table: 'Mod+M',
  taskList: 'Mod+Shift+9',
  undo: 'Mod+Z',
  wysiwygMode: 'Mod+Alt+7',
} as const;

export function formatShortcutLabel(shortcut: string) {
  const platform = typeof navigator === 'undefined' ? '' : navigator.platform;
  const isApple = /Mac|iPhone|iPad|iPod/.test(platform);

  return shortcut
    .replaceAll('Mod', isApple ? '⌘' : 'Ctrl')
    .replaceAll('Alt', isApple ? '⌥' : 'Alt')
    .replaceAll('Shift', isApple ? '⇧' : 'Shift')
    .replaceAll('ArrowUp', '↑')
    .replaceAll('ArrowDown', '↓')
    .replaceAll('+', isApple ? '' : '+');
}

export function getToolbarLabel(label: string, shortcut?: string) {
  if (!shortcut) {
    return label;
  }

  return `${label} · ${formatShortcutLabel(shortcut)}`;
}
