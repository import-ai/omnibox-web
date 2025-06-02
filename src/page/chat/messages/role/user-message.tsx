import { cn } from '@/lib/utils';
import { MessageDetail } from '@/page/chat/types/conversation';

interface IProps {
  message: MessageDetail;
}

export function UserMessage(props: IProps) {
  const { message } = props;
  const openAIMessage = message.message;
  return (
    <div
      className={cn(
        'flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2',
        'ml-auto bg-secondary text-secondary-foreground',
      )}
    >
      {openAIMessage.content}
    </div>
  );
}
