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
import useSelectedResources from './useSelectedResources.ts';
import { getGreeting } from './utils';

interface NamespaceRootResource {
  children?: unknown[];
}

export default function ChatHomePage() {
  const params = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const namespaceId = params.namespace_id || '';
  const greetingI18nKey = `chat.home.greeting.${getGreeting()}`;
  const [isEmptyWorkspace, setIsEmptyWorkspace] = useState<boolean | null>(
    null
  );
  const { config } = useConfig();
  const { user, loading: userLoading } = useUser();
  const { selectedResources, setSelectedResources } = useSelectedResources();

  useEffect(() => {
    let active = true;

    if (!namespaceId) {
      setIsEmptyWorkspace(false);
      return;
    }

    setIsEmptyWorkspace(null);

    void Promise.all([
      http.get<{ data?: unknown[] }>(
        `/namespaces/${namespaceId}/conversations?offset=0&limit=1&order=desc`,
        {
          mute: true,
        }
      ),
      http.get<Record<string, NamespaceRootResource>>(
        `/namespaces/${namespaceId}/root`,
        {
          mute: true,
        }
      ),
    ])
      .then(([conversations, roots]) => {
        if (!active) {
          return;
        }
        setIsEmptyWorkspace(
          (conversations.data?.length ?? 0) === 0 &&
            !Object.values(roots).some(
              root => Array.isArray(root?.children) && root.children.length > 0
            )
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setIsEmptyWorkspace(false);
      });

    return () => {
      active = false;
    };
  }, [namespaceId]);

  const defaultInputTemplate = (
    i18n.language.startsWith('zh')
      ? import.meta.env.VITE_CHAT_HOME_DEFAULT_INPUT_ZH
      : import.meta.env.VITE_CHAT_HOME_DEFAULT_INPUT_EN
  )?.trim();
  const username = user.username.trim();
  const defaultHomeInput =
    isEmptyWorkspace && !userLoading && username && defaultInputTemplate
      ? defaultInputTemplate.replaceAll('{username}', username)
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
