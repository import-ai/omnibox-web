'use client';

import {
  BoldPlugin,
  CodePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react';
import {
  useListToolbarButton,
  useListToolbarButtonState,
} from '@platejs/list/react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { useEditorRef } from 'platejs/react';

import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { ToolbarButton, ToolbarGroup } from '@/components/ui/toolbar';

import { FontFamilyDropdown } from './font-family-dropdown';

function ListToolbarButton({
  nodeType,
  children,
  tooltip,
}: {
  nodeType: string;
  children: React.ReactNode;
  tooltip: string;
}) {
  const state = useListToolbarButtonState({ nodeType });
  const { props } = useListToolbarButton(state);

  return (
    <ToolbarButton tooltip={tooltip} {...props}>
      {children}
    </ToolbarButton>
  );
}

export function FixedToolbarButtons() {
  const editor = useEditorRef();

  const handleInsertHr = () => {
    editor.tf.insertNodes({
      type: 'hr',
      children: [{ text: '' }],
    });
    editor.tf.insertNodes({
      type: 'p',
      children: [{ text: '' }],
    });
  };

  const handleToggleBlock = (type: string) => {
    const isActive = editor.api.block({ match: { type } });

    if (isActive) {
      editor.tf.setNodes({ type: 'p' });
    } else {
      editor.tf.setNodes({ type });
    }
  };

  const handleToggleBlockquote = () => {
    const isActive = editor.api.block({ match: { type: 'blockquote' } });

    if (isActive) {
      editor.tf.unwrapNodes({
        match: { type: 'blockquote' },
      });
    } else {
      editor.tf.wrapNodes({
        type: 'blockquote',
        children: [],
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {/* Text formatting marks */}
      <ToolbarGroup>
        <FontFamilyDropdown />
        <MarkToolbarButton nodeType={BoldPlugin.key} tooltip="粗体 (⌘B)">
          <Bold className="size-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={ItalicPlugin.key} tooltip="斜体 (⌘I)">
          <Italic className="size-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={UnderlinePlugin.key} tooltip="下划线 (⌘U)">
          <Underline className="size-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={StrikethroughPlugin.key} tooltip="删除线">
          <Strikethrough className="size-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={CodePlugin.key} tooltip="行内代码">
          <Code className="size-4" />
        </MarkToolbarButton>
      </ToolbarGroup>

      {/* Block elements */}
      <ToolbarGroup>
        <ToolbarButton tooltip="标题1" onClick={() => handleToggleBlock('h1')}>
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton tooltip="标题2" onClick={() => handleToggleBlock('h2')}>
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton tooltip="标题3" onClick={() => handleToggleBlock('h3')}>
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton tooltip="引用" onClick={handleToggleBlockquote}>
          <Quote className="size-4" />
        </ToolbarButton>
      </ToolbarGroup>

      {/* Lists */}
      <ToolbarGroup>
        <ListToolbarButton nodeType="disc" tooltip="无序列表">
          <List className="size-4" />
        </ListToolbarButton>
        <ListToolbarButton nodeType="decimal" tooltip="有序列表">
          <ListOrdered className="size-4" />
        </ListToolbarButton>
      </ToolbarGroup>

      {/* Insert */}
      <ToolbarGroup>
        <ToolbarButton tooltip="分割线" onClick={handleInsertHr}>
          <Minus className="size-4" />
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  );
}
