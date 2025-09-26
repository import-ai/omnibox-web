import React from 'react';
import { useTranslation } from 'react-i18next';

import { Textarea } from '@/components/ui/textarea';
import type { ChatActionType } from '@/page/chat/chat-input/types';

interface IProps {
  value: string;
  onChange: (value: string) => void;
  onAction: (action?: ChatActionType) => void;
}

export default function ChatInput(props: IProps) {
  const { t } = useTranslation();
  const { value, onChange, onAction } = props;
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        // @ts-ignore
        e.target.value = e.target.value + '\n';
      } else {
        onAction();
      }
    }
  };

  return (
    <div className="mb-[2px]">
      <Textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('chat.textarea.placeholder')}
        className="resize-none p-0 border-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:shadow-none hover:border-transparent hover:shadow-none placeholder:text-[#9CA3AF] dark:placeholder:text-gray-400"
      />
    </div>
  );
}
