import { deserializeMd, serializeMd } from '@platejs/markdown';
import { Plate, usePlateEditor } from 'platejs/react';
import { useCallback, useEffect } from 'react';

import { Editor, EditorContainer } from '@/components/ui/editor';
import { FixedToolbar } from '@/components/ui/fixed-toolbar';

import { editorPlugins } from './editor-plugins';
import { FixedToolbarButtons } from './fixed-toolbar-buttons';

interface NewEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export default function NewEditor({
  initialContent = '',
  onChange,
}: NewEditorProps) {
  const editor = usePlateEditor({
    plugins: editorPlugins,
  });

  // Load initial content from markdown
  useEffect(() => {
    if (initialContent && editor) {
      try {
        // Use markdown plugin to deserialize content
        const value = deserializeMd(editor, initialContent);
        if (value && value.length > 0) {
          editor.tf.reset();
          editor.tf.insertNodes(value);
        }
      } catch (error) {
        console.error('Failed to deserialize markdown:', error);
      }
    }
  }, [initialContent, editor]);

  // Handle content changes via Plate's onChange prop
  const handleChange = useCallback(
    ({ value }: { value: any }) => {
      if (onChange && editor) {
        try {
          // Serialize to markdown for storage
          const markdown = serializeMd(editor, { value });
          onChange(markdown);
        } catch (error) {
          console.error('Failed to serialize to markdown:', error);
        }
      }
    },
    [onChange, editor]
  );

  return (
    <Plate editor={editor} onChange={handleChange}>
      <FixedToolbar>
        <FixedToolbarButtons />
      </FixedToolbar>
      <EditorContainer>
        <Editor
          variant="none"
          className="size-full p-1 pt-4"
          placeholder="输入您精彩的内容..."
        />
      </EditorContainer>
    </Plate>
  );
}
