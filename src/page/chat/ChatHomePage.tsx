import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import useConfig from '@/hooks/useConfig';
import useUser from '@/hooks/useUser';
import { getChatHomeDraftScope } from '@/lib/chatBridge';
import { http } from '@/lib/request';
import { AgentCredits } from '@/page/chat/agent-credits/AgentCredits';
import { useAgentCredits } from '@/page/chat/agent-credits/useAgentCredits';
import {
  ChatCreatePayload,
  ChatMode,
  ConversationEntity,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import {
  resolveConversationImages,
  withUploadedImageParts,
} from '@/page/chat/conversation/uploadConversationImages';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';
import { navigateToResource } from '@/page/resource/resourceNavigation';

import ChatArea from './chat-input';
import FeatureCards from './home/FeatureCards';
import RecommendedQuestions, {
  RecommendedQuestionItem,
} from './home/RecommendedQuestions';
import useSelectedResources from './useSelectedResources.ts';
import { getGreeting } from './utils';

export default function ChatHomePage() {
  const [pendingMessage, setPendingMessage] =
    useState<SendMessageParams | null>(null);
  const [sendFailed, setSendFailed] = useState(false);
  const params = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const namespaceId = params.namespace_id || '';
  const greetingI18nKey = `chat.home.greeting.${getGreeting()}`;
  const [hasConversationHistory, setHasConversationHistory] = useState<
    boolean | null
  >(null);
  const { config } = useConfig();
  const { agentCredits } = useAgentCredits(namespaceId, [], config.commercial);
  const imageUploadDisabled =
    agentCredits !== undefined && agentCredits.agent_credits_remain <= 0;
  const { user, loading: userLoading } = useUser();
  const { selectedResources, setSelectedResources } = useSelectedResources();
  const creatingRecommendedQuestionRef = useRef(false);
  const [loadingRecommendedQuestionId, setLoadingRecommendedQuestionId] =
    useState<string | null>(null);
  const chatHomeDraftScope = getChatHomeDraftScope(namespaceId);

  useEffect(() => {
    creatingRecommendedQuestionRef.current = false;
    setLoadingRecommendedQuestionId(null);
  }, [namespaceId]);

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

  const sendMessage = async ({
    query,
    tools,
    selectedResources,
    mode,
    displayParts,
    approvalMode,
    recommendedQuestionId,
    images,
  }: SendMessageParams) => {
    setPendingMessage({
      query,
      tools,
      selectedResources,
      mode,
      displayParts,
      approvalMode,
      recommendedQuestionId,
      images,
    });
    setSendFailed(false);
    try {
      // Uploading images delays navigation; dismiss the keyboard before awaiting it.
      (document.activeElement as HTMLElement | null)?.blur();
      const conversation = await http.post<ConversationEntity>(
        `/namespaces/${namespaceId}/conversations`
      );
      const uploadedImages = await resolveConversationImages(
        namespaceId,
        conversation.id,
        images
      );
      sessionStorage.setItem(
        'chat-create-payload',
        JSON.stringify({
          mode,
          query,
          tools,
          selectedResources,
          displayParts: withUploadedImageParts(displayParts, uploadedImages),
          approvalMode,
          recommendedQuestionId,
          images: uploadedImages,
          conversation: {
            id: conversation.id,
          } as ConversationDetail,
        } as ChatCreatePayload)
      );
      navigateToResource(navigate, `/${namespaceId}/chat/${conversation.id}`);
    } catch {
      setSendFailed(true);
    }
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
          {pendingMessage ? (
            <div
              className="flex items-center justify-end gap-2"
              role="status"
              aria-label={t(
                sendFailed
                  ? 'chat.delivery.send_failed'
                  : 'chat.delivery.sending'
              )}
            >
              {sendFailed ? (
                <Button
                  variant="ghost"
                  onClick={() => void sendMessage(pendingMessage)}
                >
                  {t('chat.delivery.retry_send')}
                </Button>
              ) : (
                <Spinner className="size-4" />
              )}
              <div className="max-w-[75%] whitespace-pre-wrap rounded-lg bg-secondary px-3 py-2">
                {pendingMessage.query}
              </div>
            </div>
          ) : (
            <h1 className="text-[28px] text-center mb-[32px] font-medium">
              <Typewriter text={t(greetingI18nKey)} typeSpeed={32} />
            </h1>
          )}
          {config.commercial && (
            <AgentCredits
              namespaceId={namespaceId}
              agentCredits={agentCredits}
            />
          )}
          <ChatArea
            key={chatHomeDraftScope}
            messages={[]}
            namespaceId={namespaceId}
            navigatePrefix={`/${namespaceId}`}
            approvalModeResetKey={chatHomeDraftScope}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            loading={!!pendingMessage && !sendFailed}
            imageUploadDisabled={imageUploadDisabled}
            initialQuery={defaultHomeInput}
            sendMessage={sendMessage}
          />
          {config.commercial && (
            <RecommendedQuestions
              key={namespaceId}
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
