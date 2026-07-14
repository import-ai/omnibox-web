import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import useConfig from '@/hooks/useConfig';
import useUser from '@/hooks/useUser';
import { http } from '@/lib/request';
import { AgentTrial } from '@/page/chat/agent-trial/AgentTrial';
import {
  ChatCreatePayload,
  ChatMode,
  ConversationEntity,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';

import ChatArea from './chat-input';
import FeatureCards from './home/FeatureCards';
import RecommendedQuestions, {
  RecommendedQuestionItem,
} from './home/RecommendedQuestions';
import useSelectedResources from './useSelectedResources.ts';
import { getGreeting } from './utils';

export default function ChatHomePage() {
  const params = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const namespaceId = params.namespace_id || '';
  const greetingI18nKey = `chat.home.greeting.${getGreeting()}`;
  const [hasConversationHistory, setHasConversationHistory] = useState<
    boolean | null
  >(null);
  const { config } = useConfig();
  const { user, loading: userLoading } = useUser();
  const { selectedResources, setSelectedResources } = useSelectedResources();
  const creatingRecommendedQuestionRef = useRef(false);
  const [loadingRecommendedQuestionId, setLoadingRecommendedQuestionId] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!namespaceId) {
      setHasConversationHistory(true);
      return;
    }

    setHasConversationHistory(null);

    http
      .get<{ data?: unknown[] }>(
        `/namespaces/${namespaceId}/conversations?offset=0&limit=1&order=desc`,
        {
          mute: true,
        }
      )
      .then(conversations => {
        if (!active) {
          return;
        }
        setHasConversationHistory((conversations.data?.length ?? 0) > 0);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setHasConversationHistory(true);
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
    hasConversationHistory === false &&
    !userLoading &&
    username &&
    defaultInputTemplate
      ? defaultInputTemplate.replaceAll('{username}', username)
      : undefined;

  const sendMessage = ({
    query,
    tools,
    selectedResources,
    mode,
    approvalMode,
    recommendedQuestionId,
  }: SendMessageParams) => {
    return http
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
            recommendedQuestionId,
            conversation: {
              id: conversation.id,
            } as ConversationDetail,
          } as ChatCreatePayload)
        );
        navigate(`/${namespaceId}/chat/${conversation.id}`);
      });
  };
  const handleQuestionSelect = (item: RecommendedQuestionItem) => {
    if (creatingRecommendedQuestionRef.current) {
      return;
    }

    creatingRecommendedQuestionRef.current = true;
    setLoadingRecommendedQuestionId(item.id);

    sendMessage({
      query: item.question,
      tools: [],
      selectedResources: [],
      mode: ChatMode.ASK,
      approvalMode: 'manual',
      recommendedQuestionId: item.id,
    }).catch(() => {
      creatingRecommendedQuestionRef.current = false;
      setLoadingRecommendedQuestionId(null);
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
          {config.commercial && (
            <RecommendedQuestions
              namespaceId={namespaceId}
              loadingQuestionId={loadingRecommendedQuestionId}
              onSelect={handleQuestionSelect}
            />
          )}
        </div>
        <FeatureCards />
      </div>
    </div>
  );
}
