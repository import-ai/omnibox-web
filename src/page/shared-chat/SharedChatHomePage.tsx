import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ShareResourcePicker } from '@/components/resourcePicker';
import { Typewriter } from '@/components/typewriter';
import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';
import ChatArea from '@/page/chat/chat-input';
import {
  ChatCreatePayload,
  ConversationEntity,
  SendMessageParams,
} from '@/page/chat/chat-input/types.ts';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';
import { getGreeting } from '@/page/chat/utils';
import { useShareContext } from '@/page/share';

export default function SharedChatHomePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shareId = params.share_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const { shareInfo, selectedResources, setSelectedResources } =
    useShareContext();

  useEffect(() => {
    setDocumentTitle(t('chat.title'));
  }, [t]);

  const sendMessage = ({
    query,
    tools,
    selectedResources,
    mode,
    displayParts,
    approvalMode,
  }: SendMessageParams) => {
    return http
      .post(`/shares/${shareId}/conversations`)
      .then((conversation: ConversationEntity) => {
        sessionStorage.setItem(
          'shared-chat-create-payload',
          JSON.stringify({
            mode,
            query,
            tools,
            selectedResources,
            displayParts,
            approvalMode,
            conversation: {
              id: conversation.id,
            } as ConversationDetail,
          } as ChatCreatePayload)
        );
        navigate(`/s/${shareId}/chat/${conversation.id}`);
      });
  };

  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center p-4"
      data-chat-home
    >
      <div className="w-full max-w-3xl" data-chat-composer>
        <h1 className="mb-[32px] text-center text-[28px] font-medium">
          <Typewriter text={t(i18n)} typeSpeed={32} />
        </h1>
        <ChatArea
          imageUploadDisabled
          imageUploadDisabledReason={t('chat.image.share_unsupported')}
          key={`share-home:${shareId}`}
          messages={[]}
          navigatePrefix={`/s/${shareId}`}
          approvalModeResetKey={`share-home:${shareId}`}
          selectedResources={selectedResources}
          setSelectedResources={setSelectedResources}
          renderResourcePicker={
            shareInfo &&
            shareInfo.resource &&
            shareInfo.share_type !== 'chat_only'
              ? onSelect => (
                  <ShareResourcePicker
                    shareId={shareId}
                    rootResource={shareInfo.resource!}
                    canBrowseResources={shareInfo.all_resources}
                    onSelect={resource => onSelect(resource)}
                  />
                )
              : undefined
          }
          loading={false}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  );
}
