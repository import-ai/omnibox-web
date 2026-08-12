import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';

interface ChatRouteParams {
  namespaceId: string;
  conversationId: string;
  /** True when chat is embedded in Copilot (narrow panel). */
  compact: boolean;
}

interface ChatRouteParamsProviderProps {
  children: React.ReactNode;
  conversationId: string;
  namespaceId: string;
  compact?: boolean;
}

const ChatRouteParamsContext = createContext<ChatRouteParams | null>(null);

/** Supplies chat route identities when chat is rendered outside its URL route. */
export function ChatRouteParamsProvider({
  children,
  conversationId,
  namespaceId,
  compact = false,
}: ChatRouteParamsProviderProps) {
  return (
    <ChatRouteParamsContext.Provider
      value={{ conversationId, namespaceId, compact }}
    >
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
    compact: override?.compact ?? false,
  };
}
