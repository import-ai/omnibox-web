import { type Citation } from '@/page/chat/core/types/chat-response';
import { type MessageDetail } from '@/page/chat/core/types/conversation';
import { CitationsSheet } from '@/page/chat/messages/citations/citations-sheet';

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
  const index = citations.findIndex(citation => citation.id === data[0]?.id);

  return <CitationsSheet citations={data} index={index} />;
}
