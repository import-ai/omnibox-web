import { cn } from '@/lib/utils';
import { MessageDetail } from '@/page/chat/types/conversation';

interface IProps {
  message: MessageDetail;
}

export function UserMessage(props: IProps) {
  const { message } = props;
  const openAIMessage = message.message;
  const lines = openAIMessage.content?.split('\n') || [];

  return (
    <div
      className={cn(
        'flex w-fit sm:max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2',
        'ml-auto bg-secondary text-secondary-foreground dark:bg-[#303030]'
      )}
    >
      {lines.map((line, idx) => (
        <span key={idx} className="break-words">
          {line}
          {idx !== lines.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}
