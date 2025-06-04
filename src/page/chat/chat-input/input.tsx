import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  value: string;
  onChange: (value: string) => void;
  onAction: (action?: 'stop' | 'disabled') => void;
}

export default function ChatInput(props: IProps) {
  const { t } = useTranslation();
  const { value, onChange, onAction } = props;
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        onAction();
      }
    }
  };

  return (
    <div className="mt-1 mb-5">
      <Textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('chat.textarea.placeholder')}
        className="resize-none p-0 border-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:shadow-none hover:border-transparent hover:shadow-none dark:placeholder:text-gray-400"
      />
    </div>
  );
}
