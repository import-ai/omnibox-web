import { MessageOperator } from '@/page/chat/core/message-operator.ts';
import {
  ChatDeltaResponse,
  ChatErrorResponse,
  ChatResponse,
} from '@/page/chat/core/types/chat-response.ts';

export function messageProcessor(
  messageOperator: MessageOperator,
  data: string
) {
  const chatResponse: ChatResponse = JSON.parse(data);
  if (chatResponse.response_type === 'bos') {
    messageOperator.add(chatResponse);
  } else if (chatResponse.response_type === 'delta') {
    messageOperator.update(chatResponse);
  } else if (chatResponse.response_type === 'eos') {
    messageOperator.done();
  } else if (chatResponse.response_type === 'done') {
  } else if (chatResponse.response_type === 'metrics') {
    messageOperator.update({
      response_type: 'delta',
      message: {},
      attrs: {
        metrics: {
          tps: chatResponse.tps,
          tokens: chatResponse.tokens,
        },
      },
    } as ChatDeltaResponse);
  } else if (chatResponse.response_type === 'error') {
    messageOperator.error(chatResponse as ChatErrorResponse);
    console.error(chatResponse);
  } else {
    console.error({ message: 'Unknown response type', chatResponse });
  }
}
