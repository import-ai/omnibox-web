import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizardLang';
import {
  type ConversationCacheScope,
  getCachedConversation,
  getCachedConversationTitle,
  getCurrentUserId,
  setCachedConversation,
} from '@/page/chat/conversation/conversationCache';
import type { ConversationTitleGeneratedPayload } from '@/page/chat/core/types/conversation';

export type ChatTitleUpdatePayload = {
  conversationId: string;
  title: string;
};

export type ChatTitleRequestPayload = {
  conversationId: string;
  text?: string;
};

function rememberTitle(
  scope: ConversationCacheScope,
  conversationId: string,
  title: string
) {
  const cached = getCachedConversation(scope, conversationId);
  if (!cached) return;
  setCachedConversation(scope, { ...cached, title });
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

function initialTitle(
  scope: ConversationCacheScope,
  conversationId: string,
  fallback: string
) {
  if (!conversationId) return fallback;
  return getCachedConversationTitle(scope, conversationId) ?? '';
}

interface ChatTitleState {
  userId: string;
  namespaceId: string;
  conversationId: string;
  title: string;
}

/** Shared chat title state for full-page ChatHeader and Copilot panel. */
export function useChatTitle(namespaceId: string, conversationId: string) {
  const app = useApp();
  const { t, i18n } = useTranslation();
  const i18nTitle = t('chat.conversations.new');
  const userId = getCurrentUserId();
  const cacheScope = useMemo(
    () => ({ userId, namespaceId }),
    [namespaceId, userId]
  );
  const [titleState, setTitleState] = useState<ChatTitleState>(() => ({
    userId,
    namespaceId,
    conversationId,
    title: initialTitle(cacheScope, conversationId, i18nTitle),
  }));
  const activeTargetRef = useRef({ userId, namespaceId, conversationId });
  activeTargetRef.current = { userId, namespaceId, conversationId };
  const chatTitle =
    titleState.userId === userId &&
    titleState.namespaceId === namespaceId &&
    titleState.conversationId === conversationId
      ? titleState.title
      : initialTitle(cacheScope, conversationId, i18nTitle);
  const chatTitleRef = useRef(chatTitle);
  chatTitleRef.current = chatTitle;

  useEffect(() => {
    if (!conversationId) {
      setTitleState({ userId, namespaceId, conversationId, title: i18nTitle });
      return;
    }
    const cachedTitle = getCachedConversationTitle(cacheScope, conversationId);
    setTitleState({
      userId,
      namespaceId,
      conversationId,
      title: cachedTitle ?? '',
    });
  }, [cacheScope, conversationId, i18nTitle, namespaceId, userId]);

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
          cacheScope,
          resolved.conversationId || conversationId,
          resolved.title
        );
        setTitleState({
          userId,
          namespaceId,
          conversationId: resolved.conversationId || conversationId,
          title: resolved.title,
        });
      }
    );
  }, [app, cacheScope, conversationId]);

  useEffect(() => {
    return app.on(
      'chat:title:clear',
      (payload?: { conversationId?: string }) => {
        if (payload?.conversationId !== conversationId) return;
        setTitleState({ userId, namespaceId, conversationId, title: '' });
      }
    );
  }, [app, conversationId, namespaceId, userId]);

  useEffect(() => {
    return app.on(
      'chat:title',
      (payload?: ChatTitleRequestPayload | string) => {
        const resolved = resolveTitleRequest(payload);
        if (!resolved?.text) {
          if (conversationId) return;
          setTitleState({
            userId,
            namespaceId,
            conversationId: '',
            title: i18nTitle,
          });
          return;
        }
        if (!conversationId || !namespaceId) return;
        if (
          resolved.conversationId &&
          resolved.conversationId !== conversationId
        ) {
          return;
        }
        // A stored or renamed title blocks generation. The request text is
        // already the sidebar preview, so it matches the header fallback.
        const visibleTitle = chatTitleRef.current;
        if (
          visibleTitle &&
          visibleTitle !== i18nTitle &&
          visibleTitle !== resolved.text
        ) {
          return;
        }

        const target = { userId, namespaceId, conversationId };

        http
          .post(
            `/namespaces/${namespaceId}/conversations/${conversationId}/title`,
            {
              text: resolved.text,
              lang: getWizardLang(i18n),
            }
          )
          .then(res => {
            if (getCurrentUserId() !== target.userId) return;
            rememberTitle(target, target.conversationId, res.title);
            const cached = getCachedConversation(target, target.conversationId);
            const messageCreatedAt = cached
              ? Object.values(cached.mapping)
                  .map(message => message.created_at)
                  .filter((timestamp): timestamp is string => !!timestamp)
                  .sort()[0]
              : undefined;
            const payload: ConversationTitleGeneratedPayload = {
              userId: target.userId,
              namespaceId: target.namespaceId,
              conversation: {
                id: target.conversationId,
                title: res.title,
                created_at: cached?.created_at ?? messageCreatedAt,
                updated_at: cached?.updated_at,
              },
            };
            app.fire('chat:conversation:title-generated', payload);
            const activeTarget = activeTargetRef.current;
            if (
              activeTarget.userId === target.userId &&
              activeTarget.namespaceId === target.namespaceId &&
              activeTarget.conversationId === target.conversationId
            ) {
              setTitleState({
                userId: target.userId,
                namespaceId: target.namespaceId,
                conversationId: target.conversationId,
                title: res.title,
              });
            }
          });
      }
    );
  }, [app, conversationId, i18n, i18nTitle, namespaceId, userId]);

  return { chatTitle, i18nTitle };
}
