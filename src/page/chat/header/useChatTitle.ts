import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizardLang';
import {
  getCachedConversation,
  getCachedConversationTitle,
  setCachedConversation,
} from '@/page/chat/conversation/conversationCache';

export type ChatTitleUpdatePayload = {
  conversationId: string;
  title: string;
};

export type ChatTitleRequestPayload = {
  conversationId: string;
  text?: string;
};

function rememberTitle(conversationId: string, title: string) {
  const cached = getCachedConversation(conversationId);
  if (!cached) return;
  setCachedConversation({ ...cached, title });
}

function resolveTitleUpdate(
  payload: ChatTitleUpdatePayload | string | undefined
): ChatTitleUpdatePayload | null {
  if (!payload) return null;
  if (typeof payload === 'string') {
    return { conversationId: '', title: payload };
  }
  if (!payload.title) return null;
  return payload;
}

function resolveTitleRequest(
  payload: ChatTitleRequestPayload | string | undefined
): ChatTitleRequestPayload | null {
  if (payload == null) return null;
  if (typeof payload === 'string') {
    return { conversationId: '', text: payload };
  }
  return payload;
}

function initialTitle(conversationId: string, fallback: string) {
  if (!conversationId) return fallback;
  return getCachedConversationTitle(conversationId) ?? '';
}

interface ChatTitleState {
  conversationId: string;
  title: string;
}

/** Shared chat title state for full-page ChatHeader and Copilot panel. */
export function useChatTitle(namespaceId: string, conversationId: string) {
  const app = useApp();
  const { t, i18n } = useTranslation();
  const i18nTitle = t('chat.conversations.new');
  const [titleState, setTitleState] = useState<ChatTitleState>(() => ({
    conversationId,
    title: initialTitle(conversationId, i18nTitle),
  }));
  const activeConversationIdRef = useRef(conversationId);
  activeConversationIdRef.current = conversationId;
  const chatTitle =
    titleState.conversationId === conversationId
      ? titleState.title
      : initialTitle(conversationId, i18nTitle);
  const chatTitleRef = useRef(chatTitle);
  chatTitleRef.current = chatTitle;

  useEffect(() => {
    if (!conversationId) {
      setTitleState({ conversationId, title: i18nTitle });
      return;
    }
    const cachedTitle = getCachedConversationTitle(conversationId);
    setTitleState({ conversationId, title: cachedTitle ?? '' });
  }, [conversationId, i18nTitle]);

  useEffect(() => {
    return app.on(
      'chat:title:update',
      (payload: ChatTitleUpdatePayload | string) => {
        const resolved = resolveTitleUpdate(payload);
        if (!resolved) return;
        // Legacy string fires (no id) only apply when this controller has a
        // conversation — avoids painting a title onto chat home.
        if (resolved.conversationId) {
          if (resolved.conversationId !== conversationId) return;
        } else if (!conversationId) {
          return;
        }
        rememberTitle(
          resolved.conversationId || conversationId,
          resolved.title
        );
        setTitleState({
          conversationId: resolved.conversationId || conversationId,
          title: resolved.title,
        });
      }
    );
  }, [app, conversationId]);

  useEffect(() => {
    return app.on(
      'chat:title',
      (payload?: ChatTitleRequestPayload | string) => {
        const resolved = resolveTitleRequest(payload);
        if (!resolved?.text) {
          if (conversationId) return;
          setTitleState({ conversationId: '', title: i18nTitle });
          return;
        }
        if (!conversationId || !namespaceId) return;
        if (
          resolved.conversationId &&
          resolved.conversationId !== conversationId
        ) {
          return;
        }
        // Only generate while still showing the placeholder / empty title.
        if (chatTitleRef.current && chatTitleRef.current !== i18nTitle) return;

        const targetConversationId = conversationId;

        http
          .post(
            `/namespaces/${namespaceId}/conversations/${conversationId}/title`,
            {
              text: resolved.text,
              lang: getWizardLang(i18n),
            }
          )
          .then(res => {
            rememberTitle(targetConversationId, res.title);
            if (activeConversationIdRef.current === targetConversationId) {
              setTitleState({
                conversationId: targetConversationId,
                title: res.title,
              });
            }
          });
      }
    );
  }, [app, conversationId, i18n, i18nTitle, namespaceId]);

  return { chatTitle, i18nTitle };
}
