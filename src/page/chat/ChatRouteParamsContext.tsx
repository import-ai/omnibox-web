import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';

interface ChatRouteParams {
  namespaceId: string;
  conversationId: string;
}

interface ChatRouteParamsProviderProps extends ChatRouteParams {
  children: React.ReactNode;
}

const ChatRouteParamsContext = createContext<ChatRouteParams | null>(null);

/** Supplies chat route identities when chat is rendered outside its URL route. */
export function ChatRouteParamsProvider({
  children,
  conversationId,
  namespaceId,
}: ChatRouteParamsProviderProps) {
  return (
    <ChatRouteParamsContext.Provider value={{ conversationId, namespaceId }}>
      {children}
    </ChatRouteParamsContext.Provider>
  );
}

/** Resolves chat identities from a Copilot override or the current URL route. */
export function useChatRouteParams(): ChatRouteParams {
  const override = useContext(ChatRouteParamsContext);
  const params = useParams();

  return {
    conversationId: override?.conversationId || params.conversation_id || '',
    namespaceId: override?.namespaceId || params.namespace_id || '',
  };
}
