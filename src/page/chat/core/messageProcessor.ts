import { chatErrorDetails } from '@/lib/chatErrors';
import { MessageOperator } from '@/page/chat/core/messageOperator.ts';
import {
  ChatDeltaResponse,
  ChatErrorResponse,
  ChatResponse,
} from '@/page/chat/core/types/chatResponse.ts';

// The server may answer an SSE error event with plain text instead of a JSON
// chunk; retain the raw details for safe classification at display time.
export function parseChatResponse(data: string): ChatResponse {
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && 'response_type' in parsed) {
      return parsed as ChatResponse;
    }
  } catch {
    // Not JSON; reported below.
  }
  return {
    response_type: 'error',
    message: data.trim() || 'Unknown error',
    ...chatErrorDetails(data),
  } as ChatErrorResponse;
}

export function messageProcessor(
  messageOperator: MessageOperator,
  data: string
) {
  const chatResponse: ChatResponse = parseChatResponse(data);
  // Backend SSE keepalive; carries nothing for the conversation.
  if (chatResponse.response_type === 'ping') return;
  if (chatResponse.response_type === 'bos') {
    messageOperator.add(chatResponse);
  } else if (chatResponse.response_type === 'delta') {
    messageOperator.update(chatResponse, chatResponse.id);
  } else if (chatResponse.response_type === 'eos') {
    messageOperator.done(chatResponse.id);
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
    messageOperator.error(chatResponse as ChatErrorResponse, chatResponse.id);
    console.error(chatResponse);
  } else if (chatResponse.response_type === 'stopped') {
    messageOperator.stop(chatResponse.id);
  } else {
    console.error({ message: 'Unknown response type', chatResponse });
  }
}
