import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import useConfig from '@/hooks/useConfig';
import useUser from '@/hooks/useUser';
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
import { getDefaultHomeInput } from './home/getDefaultHomeInput';
import useSelectedResources from './useSelectedResources.ts';
import { getGreeting } from './utils';

interface NamespaceRootResource {
  children?: unknown[];
}

function hasNamespaceResources(
  roots: Record<string, NamespaceRootResource | undefined>
) {
  return Object.values(roots).some(
    root => Array.isArray(root?.children) && root.children.length > 0
  );
}

export default function ChatHomePage() {
  const params = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const namespaceId = params.namespace_id || '';
  const greetingI18nKey = `chat.home.greeting.${getGreeting()}`;
  const [hasConversationHistory, setHasConversationHistory] = useState<
    boolean | null
  >(null);
  const [hasWorkspaceResources, setHasWorkspaceResources] = useState<
    boolean | null
  >(null);
  const { config } = useConfig();
  const { user, loading: userLoading } = useUser();
  const { selectedResources, setSelectedResources } = useSelectedResources();

  useEffect(() => {
    let active = true;
    setHasConversationHistory(null);
    setHasWorkspaceResources(null);

    if (!namespaceId) {
      return;
    }

    const conversationRequest = http
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
    const resourceRequest = http
      .get<Record<string, NamespaceRootResource>>(
        `/namespaces/${namespaceId}/root`,
        {
          mute: true,
        }
      )
      .then(result => {
        if (!active) {
          return;
        }
        setHasWorkspaceResources(hasNamespaceResources(result));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setHasWorkspaceResources(null);
      });

    void Promise.allSettled([conversationRequest, resourceRequest]);

    return () => {
      active = false;
    };
  }, [namespaceId]);

  const defaultHomeInput =
    hasConversationHistory === false &&
    hasWorkspaceResources === false &&
    !userLoading
      ? getDefaultHomeInput({
          language: i18n.language,
          t,
          username: user.username,
        })
      : undefined;
  const sendMessage = ({
    query,
    tools,
    selectedResources,
    mode,
    approvalMode,
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
            approvalMode,
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
            <Typewriter text={t(greetingI18nKey)} typeSpeed={32} />
          </h1>
          {config.commercial && <AgentTrial namespaceId={namespaceId} />}
          <ChatArea
            messages={[]}
            navigatePrefix={`/${namespaceId}`}
            approvalModeResetKey={`home:${namespaceId}`}
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
