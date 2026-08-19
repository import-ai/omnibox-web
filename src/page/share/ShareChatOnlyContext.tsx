import { createContext, type ReactNode, useContext } from 'react';

// Chat rendering is shared between workspace chat and share chat, so the
// chat-only flag travels in its own context instead of ShareContext: a chat
// component must not pull the whole share page (and its sidebar) in to read it.
const ShareChatOnlyContext = createContext(false);

interface ShareChatOnlyProviderProps {
  chatOnly: boolean;
  children: ReactNode;
}

export function ShareChatOnlyProvider(props: ShareChatOnlyProviderProps) {
  return (
    <ShareChatOnlyContext.Provider value={props.chatOnly}>
      {props.children}
    </ShareChatOnlyContext.Provider>
  );
}

/** False outside a share page, so workspace chat keeps its resource links. */
export function useShareChatOnly(): boolean {
  return useContext(ShareChatOnlyContext);
}
