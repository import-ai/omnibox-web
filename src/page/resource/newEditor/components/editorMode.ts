export type EditorMode = 'wysiwyg' | 'instant' | 'split';

export function isRenderedEditorMode(mode: EditorMode) {
  return mode === 'wysiwyg' || mode === 'instant';
}

export function isSourceEditorMode(mode: EditorMode) {
  return mode === 'split';
}
