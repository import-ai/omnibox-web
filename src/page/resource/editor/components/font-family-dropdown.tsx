'use client';

import { Type } from 'lucide-react';
import { useEditorRef, useEditorState } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToolbarButton } from '@/components/ui/toolbar';

import { FONT_FAMILIES } from '../config/fonts';

export function FontFamilyDropdown() {
  const editor = useEditorRef();

  // 获取当前选中文本的字体
  const currentFont = useEditorState(
    editor => {
      const marks = editor.api.marks() as any;
      return marks?.fontFamily || '';
    },
    [editor]
  );

  const handleFontChange = (value: string) => {
    if (!value) {
      // 移除字体标记
      editor.tf.unsetMark({ key: 'fontFamily' });
    } else {
      // 应用字体标记
      editor.tf.setMark('fontFamily', value);
    }

    // 聚焦回编辑器
    editor.api.focus();
  };

  const currentFontLabel =
    FONT_FAMILIES.find(f => f.value === currentFont)?.label || '默认';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          isDropdown
          tooltip="字体"
          className="min-w-[100px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Type className="size-4" />
            <span className="text-sm">{currentFontLabel}</span>
          </div>
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuRadioGroup
          value={currentFont}
          onValueChange={handleFontChange}
        >
          {FONT_FAMILIES.map(font => (
            <DropdownMenuRadioItem
              key={font.value}
              value={font.value}
              className="cursor-pointer"
            >
              <span style={{ fontFamily: font.cssValue || 'inherit' }}>
                {font.label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
