import CodeBlock from '@tiptap/extension-code-block';
import { ReactNodeViewRenderer } from '@tiptap/react';

import DiagramCodeBlockView from './DiagramCodeBlockView';

export const DiagramCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DiagramCodeBlockView);
  },
});
