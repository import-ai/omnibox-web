import { useTranslation } from 'react-i18next';

import { getChatHomeDraftScope } from '@/lib/chatBridge';
import { http } from '@/lib/request';
import ChatArea from '@/page/chat/chat-input';
import {
  ChatCreatePayload,
  ConversationEntity,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { ConversationDetail } from '@/page/chat/core/types/conversation';
import useSelectedResources from '@/page/chat/useSelectedResources';
import { getGreeting } from '@/page/chat/utils';

import { useCopilotStore } from './copilotStore';

interface CopilotHomeProps {
  namespaceId: string;
}

export default function CopilotHome({ namespaceId }: CopilotHomeProps) {
  const { t } = useTranslation();
  const { selectedResources, setSelectedResources } = useSelectedResources();
  const showConversation = useCopilotStore(state => state.showConversation);
  const draftScope = getChatHomeDraftScope(namespaceId);

  const sendMessage = (params: SendMessageParams) => {
    return http
      .post(`/namespaces/${namespaceId}/conversations`)
      .then((conversation: ConversationEntity) => {
        sessionStorage.setItem(
          'chat-create-payload',
          JSON.stringify({
            ...params,
            conversation: { id: conversation.id } as ConversationDetail,
          } as ChatCreatePayload)
        );
        showConversation(namespaceId, conversation.id);
      });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-2">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center px-1">
          <h1 className="text-center text-[26px] font-medium leading-9">
            {t(`chat.home.greeting.${getGreeting()}`)}
          </h1>
        </div>
        <div className="shrink-0">
          <ChatArea
            key={draftScope}
            approvalModeResetKey={draftScope}
            loading={false}
            messages={[]}
            namespaceId={namespaceId}
            navigatePrefix={`/${namespaceId}`}
            selectedResources={selectedResources}
            sendMessage={sendMessage}
            setSelectedResources={setSelectedResources}
          />
        </div>
      </div>
      <div className="truncate pt-2 text-center text-xs text-muted-foreground">
        {t('chat.disclaimer')}
      </div>
    </div>
  );
}
