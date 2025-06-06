import { cn } from '@/lib/utils';
import useApp from '@/hooks/use-app';
import { useRef, useEffect } from 'react';
import { MessageDetail } from '@/page/chat/types/conversation';

interface IProps {
  message: MessageDetail;
}

export function UserMessage(props: IProps) {
  const { message } = props;
  const app = useApp();
  const ref = useRef('');
  const openAIMessage = message.message;
  const lines = openAIMessage.content?.split('\n') || [];

  useEffect(() => {
    if (message.parent_id || !message.message.content) {
      return;
    }
    if (ref.current === message.message.content) {
      return;
    }
    ref.current = message.message.content;
    app.fire('chat:title', message.message.content);
  }, [message]);

  return (
    <div
      className={cn(
        'flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2',
        'ml-auto bg-secondary text-secondary-foreground',
      )}
    >
      {lines.map((line, idx) => (
        <span key={idx}>
          {line}
          {idx !== lines.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}
