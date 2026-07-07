import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Textarea } from '@/components/ui/Textarea';

interface IProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export default function ChatInput(props: IProps) {
  const { value, disabled, onChange, onSend } = props;
  const { t } = useTranslation();
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200);
    textarea.style.height = `${newHeight}px`;
    textarea.scrollTop = textarea.scrollHeight;
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing || e.key !== 'Enter' || e.shiftKey) {
      return;
    }
    e.preventDefault();
    if (disabled || e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }
    onSend();
  };
  const handleCompositionStart = () => {
    setIsComposing(true);
  };
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  useEffect(adjustHeight, [value]);

  return (
    <div className="mb-[2px]">
      <Textarea
        value={value}
        ref={textareaRef}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder={t('chat.textarea.placeholder')}
        className="resize-none no-scrollbar p-0 border-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:shadow-none hover:border-transparent hover:shadow-none placeholder:text-[#9CA3AF] dark:placeholder:text-gray-400"
      />
    </div>
  );
}
