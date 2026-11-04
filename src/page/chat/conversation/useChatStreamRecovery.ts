import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
  chatErrorDetails,
  isChatCancellation,
  isTransientChatError,
} from '@/lib/chatErrors';
import type { MessageOperator } from '@/page/chat/core/messageOperator';
import { OpenAIMessageRole } from '@/page/chat/core/types/chatResponse';
import type { ConversationDetail } from '@/page/chat/core/types/conversation';

import {
  activeLeaf,
  adoptAcceptedRequest,
  findAcceptedRequest,
  hasUnfinishedTurn,
  interruptionPlan,
  isLocalRequestMessage,
  isReplyComplete,
  mergeRecoverySnapshot,
  resumeStreamCursor,
  type SnapshotQuery,
  snapshotQuery,
  snapshotRevisions,
  type StreamState,
} from './chatStreamRecovery';

const MAX_RECOVERY_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 8000;

export interface RecoverableStream {
  cancel?: () => Promise<void>;
  destroy?: () => void;
  getLastEventId?: () => string | undefined;
}

export interface ResumableStream extends RecoverableStream {
  start: () => Promise<void>;
  getLastResponseType?: () => string | undefined;
}

interface ChatStreamRecoveryOptions {
  conversationId: string;
  scopeKey?: string;
  conversationRef: MutableRefObject<ConversationDetail>;
  setConversation: Dispatch<SetStateAction<ConversationDetail>>;
  messageOperator: MessageOperator;
  askAbortRef: MutableRefObject<(() => Promise<void>) | null>;
  detachStreamRef: MutableRefObject<(() => void) | null>;
  onUnavailable?: () => void;
  loadSnapshot: (query: SnapshotQuery) => Promise<ConversationDetail>;
  createResumeStream: (
    lastEventId?: string,
    onOpen?: () => void
  ) => ResumableStream;
}

interface RecoverOptions {
  initialConversation?: ConversationDetail;
  // Local user message whose delivery is in doubt.
  pendingRequestId?: string;
  // Cursor of the stream this page was reading.
  cursor?: string;
  // A page resumed, so the local reader must be dropped even if it looks
  // alive; browsers can leave a suspended fetch without an error.
  force?: boolean;
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function isUnavailable(error: unknown) {
  const { status } = chatErrorDetails(error);
  return status === 401 || status === 403 || status === 404;
}

export default function useChatStreamRecovery(
  options: ChatStreamRecoveryOptions
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [streamState, setStreamState] = useState<StreamState>('connected');
  const stateRef = useRef<StreamState>('connected');
  const cursorRef = useRef<string | undefined>(undefined);
  const activeStreamRef = useRef<RecoverableStream | undefined>(undefined);
  const runningRef = useRef(false);
  const suppressedRef = useRef(false);
  const generationRef = useRef(0);
  const destroyedRef = useRef(false);

  const updateState = useCallback((next: StreamState) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    setStreamState(next);
  }, []);

  const releaseStream = useCallback(() => {
    const current = optionsRef.current;
    const active = activeStreamRef.current;
    if (!active) return;
    if (current.askAbortRef.current === active.cancel) {
      current.askAbortRef.current = null;
    }
    if (current.detachStreamRef.current === active.destroy) {
      current.detachStreamRef.current = null;
    }
    activeStreamRef.current = undefined;
  }, []);

  // Track a stream started elsewhere (a send or the bootstrap resume) so a
  // later recovery can read its cursor and close the reader.
  const track = useCallback((stream: RecoverableStream) => {
    activeStreamRef.current = stream;
  }, []);

  const untrack = useCallback((stream: RecoverableStream) => {
    if (activeStreamRef.current === stream) activeStreamRef.current = undefined;
  }, []);

  const captureCursor = useCallback(() => {
    const cursor = activeStreamRef.current?.getLastEventId?.();
    if (cursor) cursorRef.current = cursor;
    return cursorRef.current;
  }, []);

  const markUndelivered = useCallback(
    (requestId: string) => {
      optionsRef.current.messageOperator.error(
        {
          response_type: 'error',
          message: 'Message not delivered',
          code: 'stream_send_failed',
        },
        requestId
      );
      updateState('interrupted');
    },
    [updateState]
  );

  const markInterrupted = useCallback(
    (error?: unknown, conversation?: ConversationDetail) => {
      const { conversationRef, messageOperator } = optionsRef.current;
      const plan = interruptionPlan(conversation ?? conversationRef.current);
      const details = chatErrorDetails(error);
      if (plan) {
        let messageId = plan.messageId;
        if (plan.assistantParentId) {
          messageId = uuidv4();
          messageOperator.add({
            response_type: 'bos',
            id: messageId,
            role: OpenAIMessageRole.ASSISTANT,
            parentId: plan.assistantParentId,
            created_at: new Date().toISOString(),
          });
        }
        messageOperator.error(
          {
            response_type: 'error',
            message: details.message || 'Stream interrupted',
            code: details.code ?? 'stream_interrupted',
            status: details.status,
          },
          messageId
        );
      }
      updateState('interrupted');
    },
    [updateState]
  );

  const mergeSnapshot = useCallback(
    (
      snapshot: ConversationDetail,
      revisions: Record<string, number>,
      requestId?: string,
      stale: () => boolean = () => false
    ) => {
      optionsRef.current.setConversation(previous => {
        if (stale() || previous.id !== snapshot.id) return previous;
        const merged = mergeRecoverySnapshot(previous, snapshot, revisions);
        return requestId ? adoptAcceptedRequest(merged, requestId) : merged;
      });
    },
    []
  );

  const resumeOnce = useCallback(
    async (cursor: string | undefined, stale: () => boolean) => {
      const current = optionsRef.current;
      const stream = current.createResumeStream(cursor, () => {
        if (!stale()) updateState('connected');
      });
      activeStreamRef.current = stream;
      current.askAbortRef.current = stream.cancel ?? null;
      current.detachStreamRef.current = stream.destroy ?? null;
      try {
        await stream.start();
        return ['done', 'error', 'stopped'].includes(
          stream.getLastResponseType?.() ?? ''
        );
      } finally {
        if (!stale()) {
          const lastEventId = stream.getLastEventId?.();
          if (lastEventId) cursorRef.current = lastEventId;
        }
        if (activeStreamRef.current === stream) releaseStream();
      }
    },
    [releaseStream, updateState]
  );

  const recover = useCallback(
    async (params: RecoverOptions = {}) => {
      if (!optionsRef.current.conversationId || destroyedRef.current) return;
      if (suppressedRef.current || (runningRef.current && !params.force))
        return;

      const committed = optionsRef.current.conversationRef.current;
      const local = activeLeaf(committed)
        ? committed
        : (params.initialConversation ?? committed);
      if (!params.pendingRequestId && !hasUnfinishedTurn(local)) {
        if (stateRef.current !== 'connected') updateState('connected');
        return;
      }
      if (!isOnline()) {
        if (hasUnfinishedTurn(local)) updateState('offline');
        return;
      }

      const generation = ++generationRef.current;
      const scope = optionsRef.current.scopeKey;
      const conversationId = optionsRef.current.conversationId;
      const stale = () =>
        destroyedRef.current ||
        suppressedRef.current ||
        optionsRef.current.scopeKey !== scope ||
        optionsRef.current.conversationId !== conversationId ||
        generationRef.current !== generation;
      runningRef.current = true;
      try {
        if (params.force || activeStreamRef.current) {
          captureCursor();
          activeStreamRef.current?.destroy?.();
          releaseStream();
        } else if (params.cursor) {
          cursorRef.current = params.cursor;
        }
        updateState('recovering');

        let attempt = 0;
        let cursorOverride = params.cursor;
        for (;;) {
          try {
            const before =
              attempt === 0
                ? local
                : optionsRef.current.conversationRef.current;
            const leafBefore = activeLeaf(before);
            const requestId =
              params.pendingRequestId ??
              (isLocalRequestMessage(leafBefore) ? leafBefore?.id : undefined);

            // Read the server only to decide whether the turn is still
            // running. Merging its text here would make the resume below
            // replay events this page already shows.
            const revisions = snapshotRevisions(before);
            const snapshot = await optionsRef.current.loadSnapshot(
              snapshotQuery(before)
            );
            if (stale()) return;

            const localRequest = requestId
              ? before.mapping[requestId]
              : undefined;
            const resumeCursor =
              cursorOverride ?? cursorRef.current ?? resumeStreamCursor(before);

            const acceptedBefore =
              localRequest && findAcceptedRequest(snapshot, localRequest);
            if (
              isReplyComplete(snapshot) &&
              (!localRequest || acceptedBefore)
            ) {
              mergeSnapshot(snapshot, revisions, requestId, stale);
              cursorRef.current = undefined;
              updateState('connected');
              return;
            }
            cursorOverride = undefined;
            const terminal = await resumeOnce(resumeCursor, stale);
            if (stale()) return;
            const current = optionsRef.current.conversationRef.current;
            const afterRevisions = snapshotRevisions(current);
            const after = await optionsRef.current.loadSnapshot(
              snapshotQuery(current)
            );
            if (stale()) return;
            if (
              localRequest &&
              requestId &&
              !findAcceptedRequest(after, localRequest) &&
              isLocalRequestMessage(current.mapping[requestId])
            ) {
              cursorRef.current = undefined;
              markUndelivered(requestId);
              return;
            }
            mergeSnapshot(after, afterRevisions, requestId, stale);
            if (!terminal && activeLeaf(after) && !isReplyComplete(after)) {
              markInterrupted(undefined, after);
              return;
            }
            cursorRef.current = undefined;
            updateState('connected');
            return;
          } catch (error) {
            if (stale() || isChatCancellation(error)) return;
            if (isTransientChatError(error)) {
              if (!isOnline()) {
                updateState('offline');
                return;
              }
              attempt += 1;
              if (attempt >= MAX_RECOVERY_ATTEMPTS) {
                if (
                  isLocalRequestMessage(
                    activeLeaf(optionsRef.current.conversationRef.current)
                  )
                )
                  markUndelivered(
                    activeLeaf(optionsRef.current.conversationRef.current)!.id
                  );
                else
                  markInterrupted({
                    code: 'stream_interrupted',
                    message: chatErrorDetails(error).message,
                  });
                return;
              }
              updateState('recovering');
              await delay(Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS));
              if (stale()) return;
              continue;
            }
            if (isUnavailable(error)) {
              optionsRef.current.onUnavailable?.();
              updateState('connected');
              return;
            }
            markInterrupted(error);
            return;
          }
        }
      } finally {
        if (generationRef.current === generation) runningRef.current = false;
      }
    },
    [
      captureCursor,
      markInterrupted,
      markUndelivered,
      mergeSnapshot,
      releaseStream,
      resumeOnce,
      updateState,
    ]
  );

  // A new turn owns the stream: drop the previous cursor and stop recovering
  // a reply the user left behind.
  const reset = useCallback(() => {
    generationRef.current += 1;
    runningRef.current = false;
    suppressedRef.current = false;
    cursorRef.current = undefined;
    activeStreamRef.current?.destroy?.();
    releaseStream();
    updateState('connected');
  }, [releaseStream, updateState]);

  // The user stopped the turn: never bring it back on the next page resume.
  const stop = useCallback(() => {
    generationRef.current += 1;
    runningRef.current = false;
    suppressedRef.current = true;
    cursorRef.current = undefined;
    activeStreamRef.current?.destroy?.();
    releaseStream();
    updateState('connected');
  }, [releaseStream, updateState]);

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
      generationRef.current += 1;
      activeStreamRef.current?.destroy?.();
    };
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    runningRef.current = false;
    activeStreamRef.current?.destroy?.();
    releaseStream();
    cursorRef.current = undefined;
    suppressedRef.current = false;
    updateState('connected');
  }, [options.conversationId, options.scopeKey, releaseStream, updateState]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void recover({ force: true });
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void recover({ force: true });
    };
    const onOnline = () => {
      // No stream can be trusted across a network transition: drop the local
      // reader without canceling the server turn, then resume from its cursor.
      void recover({ force: true });
    };
    const onOffline = () => {
      const local = optionsRef.current.conversationRef.current;
      if (hasUnfinishedTurn(local) || stateRef.current !== 'connected') {
        updateState('offline');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [options.conversationId, recover, updateState]);

  const isRecovering = useCallback(
    () => runningRef.current || stateRef.current === 'offline',
    []
  );
  return { streamState, recover, reset, stop, track, untrack, isRecovering };
}
