import { CitationsSheet } from '@/page/chat/messages/citations/citations-sheet';
import { type Citation } from '@/page/chat/types/chat-response';
import { type MessageDetail } from '@/page/chat/types/conversation';

interface IProps {
  citations: Citation[];
  message: MessageDetail;
}

export function ToolMessage(props: IProps) {
  const { citations, message } = props;
  const data: Citation[] = message.attrs?.citations || [];
  if (data.length <= 0) {
    return null;
  }
  const index = citations.findIndex(citation => citation.id === message.id);

  return <CitationsSheet citations={data} index={index} />;
}
