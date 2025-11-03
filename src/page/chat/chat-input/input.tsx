import type { ChatActionType } from '@/page/chat/chat-input/types';

import { ChatTextarea } from './textarea';

interface IProps {
  value: string;
  onChange: (value: string) => void;
  onAction: (action?: ChatActionType) => void;
}

export default function ChatInput(props: IProps) {
  const { value, onChange, onAction } = props;

  return (
    <div className="mb-[2px]">
      <ChatTextarea value={value} onChange={onChange} onAction={onAction} />
    </div>
  );
}
