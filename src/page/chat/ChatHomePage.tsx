import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import useConfig from '@/hooks/useConfig';
import useUser from '@/hooks/useUser';
import { getChatHomeDraftScope, setPendingChatPayload } from '@/lib/chatBridge';
import { http } from '@/lib/request';
import { AgentCredits } from '@/page/chat/agent-credits/AgentCredits';
import { useAgentCredits } from '@/page/chat/agent-credits/useAgentCredits';
import {
  ChatMessageDisplayPart,
  ChatMode,
  ConversationEntity,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { withUploadedImageParts } from '@/page/chat/conversation/uploadConversationImages';
import { createClientKey } from '@/page/chat/core/clientKey';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import { UserMessage } from '@/page/chat/messages/role/UserMessage';
import { navigateToResource } from '@/page/resource/resourceNavigation';

import ChatArea from './chat-input';
import Scrollbar from './conversation/Scrollbar';
import FeatureCards from './home/FeatureCards';
import RecommendedQuestions, {
  RecommendedQuestionItem,
} from './home/RecommendedQuestions';
import useSelectedResources from './useSelectedResources.ts';
import { getGreeting } from './utils';

export default function ChatHomePage() {
  const [pendingMessage, setPendingMessage] =
    useState<SendMessageParams | null>(null);
  const pendingClientKey = useRef(createClientKey());
  const [sendFailed, setSendFailed] = useState(false);
  const [pendingDisplayParts, setPendingDisplayParts] = useState<
    ChatMessageDisplayPart[] | undefined
  >();

  useEffect(() => {
    const previewUrls: string[] = [];
    const images = pendingMessage?.images?.map(image => {
      if ('file' in image) {
        const url = URL.createObjectURL(image.file);
        previewUrls.push(url);
        return { attachment_id: image.id, name: image.name, url };
      }
      return image;
    });
    setPendingDisplayParts(
      withUploadedImageParts(pendingMessage?.displayParts, images ?? [])
    );
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [pendingMessage]);
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
    setSendFailed(false);
    try {
      // Uploading images delays navigation; dismiss the keyboard before awaiting it.
      (document.activeElement as HTMLElement | null)?.blur();
      const conversation = await http.post<ConversationEntity>(
        `/namespaces/${namespaceId}/conversations`
      );
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
      setPendingChatPayload(conversation.id, {
        query,
        tools,
        selectedResources,
        mode,
        displayParts,
        approvalMode,
        recommendedQuestionId,
        images,
      });
      sessionStorage.setItem(
        'chat-create-payload',
        JSON.stringify({
          mode,
          query,
          tools,
          selectedResources,
          displayParts,
          approvalMode,
          recommendedQuestionId,
          conversation: { id: conversation.id },
        })
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
    <div
      className={
        pendingMessage
          ? 'flex min-h-0 max-h-full min-w-0 flex-1 flex-col overflow-hidden'
          : 'flex justify-center flex-1 p-4 overflow-auto'
      }
    >
      {pendingMessage && (
        <Scrollbar>
          <UserMessage
            hideActions
            message={{
              id: 'pending-home-query',
              clientKey: pendingClientKey.current,
              message: {
                role: OpenAIMessageRole.USER,
                content: pendingMessage.query,
              },
              status: sendFailed ? MessageStatus.FAILED : MessageStatus.PENDING,
              parent_id: '',
              children: [],
              attrs: {
                pending_query: true,
                tools: pendingMessage.tools.map(name => ({ name })),
                user_context: {
                  selected_resources: pendingMessage.selectedResources.map(
                    context => context.resource.id
                  ),
                },
                composer: { display_parts: pendingDisplayParts },
              },
            }}
            onEdit={() => void sendMessage(pendingMessage)}
          />
        </Scrollbar>
      )}
      <div
        className={
          pendingMessage
            ? 'relative z-20 flex min-h-0 max-h-full min-w-0 shrink-0 justify-center bg-white px-4 dark:bg-background'
            : 'flex flex-col h-full max-w-3xl w-full'
        }
        data-chat-composer={pendingMessage ? '' : undefined}
      >
        <div
          className={
            pendingMessage
              ? 'min-w-0 w-full max-w-3xl'
              : 'flex flex-col justify-center flex-1 mb-8'
          }
        >
          {!pendingMessage && (
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
            initialQuery={pendingMessage ? undefined : defaultHomeInput}
            sendMessage={sendMessage}
          />
          {pendingMessage && (
            <div
              data-chat-disclaimer
              className="truncate pt-2 text-center text-xs text-muted-foreground"
            >
              {t('chat.disclaimer')}
            </div>
          )}
          {!pendingMessage && config.commercial && (
            <RecommendedQuestions
              key={namespaceId}
              namespaceId={namespaceId}
              loadingQuestionId={loadingRecommendedQuestionId}
              onSelect={handleQuestionSelect}
            />
          )}
        </div>
        {!pendingMessage && <FeatureCards />}
      </div>
    </div>
  );
}
