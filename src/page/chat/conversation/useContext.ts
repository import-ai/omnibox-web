import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { API_BASE_URL, FORCE_ASK } from '@/const';
import useApp from '@/hooks/use-app';
import { detectBrowserLanguage } from '@/lib/detect-language';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizard-lang';
import {
  type ConversationPreferences,
  toolsToPreferences,
} from '@/page/chat/chat-input/conversation-preferences';
import {
  AgentRequestChannel,
  ChatCreatePayload,
  ChatMode,
  SendMessageParams,
  ToolType,
} from '@/page/chat/chat-input/types';
import {
  ask,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
} from '@/page/chat/conversation/utils.ts';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/core/message-operator.ts';
import { MessageStatus } from '@/page/chat/core/types/chat-response.ts';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import useGlobalContext from '@/page/chat/useSelectedResources.ts';

import { getTitleFromConversationDetail } from '../utils';

const PREFERENCES_PATCH_DELAY_MS = 300;

interface PendingPreferencesPatch {
  namespaceId: string;
  conversationId: string;
  preferences: ConversationPreferences | null;
}

function buildPreferenceHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const lang = localStorage.getItem('i18nextLng') || detectBrowserLanguage();

  return {
    'Content-Type': 'application/json',
    From: 'web',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(lang ? { 'X-Lang': lang } : {}),
  };
}

function patchConversationPreferences(
  pending: PendingPreferencesPatch,
  keepalive = false
) {
  const url = `/namespaces/${pending.namespaceId}/conversations/${pending.conversationId}`;
  const data = { preferences: pending.preferences };

  if (!keepalive) {
    void http.patch(url, data, { mute: true });
    return;
  }

  void fetch(`${API_BASE_URL}${url}`, {
    method: 'PATCH',
    headers: buildPreferenceHeaders(),
    body: JSON.stringify(data),
    keepalive: true,
  }).catch(() => {
    // When unloading the page, only perform the last state synchronization. If it fails, do not interrupt the process of leaving.
  });
}

export default function useContext() {
  const app = useApp();
  const params = useParams();
  const { i18n } = useTranslation();
  const askAbortRef = useRef<() => void>(null);
  const preferencesPatchTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingPreferencesPatchRef = useRef<PendingPreferencesPatch | null>(
    null
  );
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const [loading, setLoading] = useState<boolean>(false);
  const { selectedResources, setSelectedResources } = useGlobalContext();
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const channel = AgentRequestChannel.WEB;
  const messages = useMemo((): MessageDetail[] => {
    const result: MessageDetail[] = [];
    let currentNode: string | undefined = conversation.current_node;
    while (currentNode) {
      const message = conversation.mapping[currentNode];
      if (!message) {
        break;
      }
      result.unshift(message);
      currentNode = message.parent_id;
    }
    return result;
  }, [conversation]);
  const messageOperator = useMemo((): MessageOperator => {
    return createMessageOperator(conversation, setConversation);
  }, [conversation, setConversation]);

  const applyConversationDetail = useCallback(
    (response: ConversationDetail) => {
      const conversationTitle = getTitleFromConversationDetail(response);
      if (conversationTitle) {
        app.fire('chat:title:update', conversationTitle);
      }
      setConversation(response);
    },
    [app]
  );

  const flushPendingPreferences = useCallback((keepalive = false) => {
    const pending = pendingPreferencesPatchRef.current;
    if (!pending) {
      return;
    }

    if (preferencesPatchTimeoutRef.current) {
      clearTimeout(preferencesPatchTimeoutRef.current);
      preferencesPatchTimeoutRef.current = null;
    }
    pendingPreferencesPatchRef.current = null;
    patchConversationPreferences(pending, keepalive);
  }, []);

  const updateConversationPreferences = useCallback(
    (tools: ToolType[]) => {
      if (!namespaceId || !conversationId) {
        return;
      }

      const preferences = toolsToPreferences(tools);
      setConversation(prev => ({
        ...prev,
        preferences,
      }));

      if (preferencesPatchTimeoutRef.current) {
        clearTimeout(preferencesPatchTimeoutRef.current);
      }
      pendingPreferencesPatchRef.current = {
        namespaceId,
        conversationId,
        preferences,
      };

      preferencesPatchTimeoutRef.current = setTimeout(() => {
        flushPendingPreferences();
      }, PREFERENCES_PATCH_DELAY_MS);
    },
    [namespaceId, conversationId, flushPendingPreferences]
  );

  useEffect(() => {
    const handlePageHide = () => {
      flushPendingPreferences(true);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      flushPendingPreferences(true);
    };
  }, [flushPendingPreferences]);

  const sendMessage = async ({
    query,
    tools,
    selectedResources,
    mode,
    decisions,
  }: SendMessageParams) => {
    const v = query.trim();
    if (v || (decisions && decisions.length > 0)) {
      try {
        setLoading(true);
        const url = `/api/v1/namespaces/${namespaceId}/wizard/${FORCE_ASK ? 'ask' : mode}`;
        const askFN = ask(
          conversationId,
          v,
          tools,
          selectedResources,
          channel,
          messages.at(-1)?.id,
          messageOperator,
          url,
          getWizardLang(i18n),
          namespaceId,
          undefined,
          undefined,
          undefined,
          decisions ? { decisions } : undefined
        );
        askAbortRef.current = askFN.destroy;
        await askFN.start();
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    const state = sessionStorage.getItem('chat-create-payload');
    const chatCreatePayload: ChatCreatePayload | undefined = state
      ? JSON.parse(state)
      : undefined;
    if (!chatCreatePayload) {
      http
        .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
        .then(applyConversationDetail);
      return;
    }
    sessionStorage.removeItem('chat-create-payload');
    setConversation({
      ...chatCreatePayload.conversation,
      id: conversationId,
      preferences:
        chatCreatePayload.conversation.preferences ??
        toolsToPreferences(chatCreatePayload.tools),
      mapping: chatCreatePayload.conversation.mapping ?? {},
    });
    void sendMessage(chatCreatePayload);
  }, [namespaceId, conversationId, applyConversationDetail]);

  const mergedLoading =
    ![MessageStatus.FAILED, MessageStatus.SUCCESS].includes(
      messages.at(-1)?.status ?? MessageStatus.PENDING
    ) || loading;

  const onRegenerate = async (messageId: string) => {
    const parentId = messageOperator.getParent(messageId);
    const parentMessage = conversation.mapping[parentId];
    if (!parentMessage || !parentMessage.message.content) {
      console.error('Cannot find parent user message to regenerate from');
      return;
    }

    const {
      originalTools,
      originalContext,
      originalLang,
      originalEnableThinking,
    } = extractOriginalMessageSettings(parentMessage);

    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        parentMessage.message.content,
        originalTools,
        originalContext,
        channel,
        parentId,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${ChatMode.ASK}`,
        originalLang,
        namespaceId,
        undefined,
        undefined,
        originalEnableThinking
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

  const onEdit = async (messageId: string, newContent: string) => {
    const parentId = conversation.mapping[messageId].parent_id;
    const editedMessage = conversation.mapping[messageId];

    const {
      originalTools,
      originalContext,
      originalLang,
      originalEnableThinking,
    } = extractOriginalMessageSettings(editedMessage);

    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        newContent,
        originalTools,
        originalContext,
        channel,
        parentId,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${ChatMode.ASK}`,
        originalLang,
        namespaceId,
        undefined,
        undefined,
        originalEnableThinking
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

  const firstUserMessage = findFirstMessageWithMissingParent(messages);

  useEffect(() => {
    if (firstUserMessage?.message.content) {
      app.fire('chat:title', firstUserMessage.message.content);
    }
  }, [firstUserMessage?.message.content, app]);

  return {
    loading: mergedLoading,
    sendMessage,
    messages,
    selectedResources,
    setSelectedResources,
    namespaceId,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
    updateConversationPreferences,
  };
}
