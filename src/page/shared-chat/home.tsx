import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

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
  const { selectedResources, setSelectedResources } = useShareContext();

  useEffect(() => {
    setDocumentTitle(t('chat.title'));
  }, [t]);

  const sendMessage = ({
    query,
    tools,
    selectedResources,
    mode,
  }: SendMessageParams) => {
    http
      .post(`/shares/${shareId}/conversations`)
      .then((conversation: ConversationEntity) => {
        sessionStorage.setItem(
          'shared-chat-create-payload',
          JSON.stringify({
            mode,
            query,
            tools,
            selectedResources,
            conversation: {
              id: conversation.id,
            } as ConversationDetail,
          } as ChatCreatePayload)
        );
        navigate(`/s/${shareId}/chat/${conversation.id}`);
      });
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <h1 className="mb-[32px] text-center text-[28px] font-medium">
          <Typewriter text={t(i18n)} typeSpeed={32} />
        </h1>
        <ChatArea
          messages={[]}
          navigatePrefix={`/s/${shareId}`}
          selectedResources={selectedResources}
          setSelectedResources={setSelectedResources}
          loading={false}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  );
}
