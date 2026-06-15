import type {} from '@tiptap/markdown';
import type { Editor } from '@tiptap/react';

export function createInlineMathSnippet() {
  return '$x = y$';
}

export function createBlockMathSnippet() {
  return '$$\nx = y\n$$';
}

export function createMermaidSnippet() {
  return '```mermaid\ngraph TD\n  A[Start] --> B[End]\n```';
}

export function createEchartsSnippet() {
  return '```echarts\n{\n  "xAxis": { "type": "category", "data": ["A", "B"] },\n  "yAxis": { "type": "value" },\n  "series": [{ "type": "bar", "data": [10, 20] }]\n}\n```';
}

export function insertMarkdownSnippet(editor: Editor, snippet: string) {
  editor
    .chain()
    .focus()
    .insertContent(snippet, {
      contentType: 'markdown',
    })
    .run();
}
