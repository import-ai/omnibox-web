import { type MessageDetail } from '@/page/chat/types/conversation';
import { type Citation } from '@/page/chat/types/chat-response';
import { CitationsSheet } from '@/page/chat/messages/citations/citations-sheet';

interface IProps {
  message: MessageDetail;
}

export function ToolMessage(props: IProps) {
  const { message } = props;
  const citations: Citation[] = message.attrs?.citations || [];

  return <CitationsSheet citations={citations} />;
}
