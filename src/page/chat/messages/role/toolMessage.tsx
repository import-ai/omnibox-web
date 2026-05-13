import { type Citation } from '@/page/chat/core/types/chatResponse';
import { type MessageDetail } from '@/page/chat/core/types/conversation';
import { CitationsSheet } from '@/page/chat/messages/citations/citationsSheet';

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
