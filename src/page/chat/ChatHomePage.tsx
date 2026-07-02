import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import useConfig from '@/hooks/useConfig';
import { http } from '@/lib/request';
import { AgentTrial } from '@/page/chat/agent-trial/AgentTrial';
import {
  ChatCreatePayload,
  ConversationEntity,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';

import ChatArea from './chat-input';
import FeatureCards from './home/FeatureCards';
import useSelectedResources from './useSelectedResources.ts';
import { getGreeting } from './utils';

export default function ChatHomePage() {
  const params = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const namespaceId = params.namespace_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const [hasConversationHistory, setHasConversationHistory] = useState<
    boolean | null
  >(null);
  const { config } = useConfig();
  const { selectedResources, setSelectedResources } = useSelectedResources();

  useEffect(() => {
    let active = true;
    setHasConversationHistory(null);

    if (!namespaceId) {
      return;
    }

    http
      .get(
        `/namespaces/${namespaceId}/conversations?offset=0&limit=1&order=desc`,
        {
          mute: true,
        }
      )
      .then((result: { total?: number; data?: unknown[] }) => {
        if (!active) {
          return;
        }
        const size = result?.data?.length ?? 0;
        setHasConversationHistory(size > 0);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setHasConversationHistory(null);
      });

    return () => {
      active = false;
    };
  }, [namespaceId]);

  const defaultHomeInput =
    hasConversationHistory === false ? t('chat.home.default_input') : undefined;
  const sendMessage = ({
    query,
    tools,
    selectedResources,
    mode,
  }: SendMessageParams) => {
    http
      .post(`/namespaces/${namespaceId}/conversations`)
      .then((conversation: ConversationEntity) => {
        sessionStorage.setItem(
          'chat-create-payload',
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
        navigate(`/${namespaceId}/chat/${conversation.id}`);
      });
  };

  return (
    <div className="flex justify-center flex-1 p-4 overflow-auto">
      <div className="flex flex-col h-full max-w-3xl w-full">
        <div className="flex flex-col justify-center flex-1 mb-8">
          <h1 className="text-[28px] text-center mb-[32px] font-medium">
            <Typewriter text={t(i18n)} typeSpeed={32} />
          </h1>
          {config.commercial && <AgentTrial namespaceId={namespaceId} />}
          <ChatArea
            messages={[]}
            navigatePrefix={`/${namespaceId}`}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            loading={false}
            initialQuery={defaultHomeInput}
            sendMessage={sendMessage}
          />
        </div>
        <FeatureCards />
      </div>
    </div>
  );
}
