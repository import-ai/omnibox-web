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
  resumeStreamCursor,
  type SnapshotQuery,
  snapshotQuery,
  type StreamState,
} from './chatStreamRecovery';
import { mergeHistoryPage } from './conversationHistory';

const MAX_RECOVERY_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 8000;

export interface RecoverableStream {
  cancel?: () => Promise<void>;
  destroy?: () => void;
  getLastEventId?: () => string | undefined;
}

export interface ResumableStream extends RecoverableStream {
  start: () => Promise<void>;
}

interface ChatStreamRecoveryOptions {
  conversationId: string;
  conversationRef: MutableRefObject<ConversationDetail>;
  setConversation: Dispatch<SetStateAction<ConversationDetail>>;
  messageOperator: MessageOperator;
  askAbortRef: MutableRefObject<(() => Promise<void>) | null>;
  detachStreamRef: MutableRefObject<(() => void) | null>;
  loadSnapshot: (query: SnapshotQuery) => Promise<ConversationDetail>;
  createResumeStream: (
    lastEventId?: string,
    onOpen?: () => void
  ) => ResumableStream;
}

interface RecoverOptions {
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
    (snapshot: ConversationDetail, requestId?: string) => {
      const before = optionsRef.current.conversationRef.current;
      const revisions = Object.fromEntries(
        Object.entries(before.mapping).map(([id, message]) => [
          id,
          message.localRevision ?? 0,
        ])
      );
      optionsRef.current.setConversation(previous => {
        if (previous.id !== snapshot.id) return previous;
        const merged = mergeHistoryPage(previous, snapshot, false, revisions);
        return requestId ? adoptAcceptedRequest(merged, requestId) : merged;
      });
    },
    []
  );

  const resumeOnce = useCallback(
    async (cursor?: string) => {
      const stream = optionsRef.current.createResumeStream(cursor, () =>
        updateState('connected')
      );
      const current = optionsRef.current;
      activeStreamRef.current = stream;
      current.askAbortRef.current = stream.cancel ?? null;
      current.detachStreamRef.current = stream.destroy ?? null;
      try {
        await stream.start();
      } finally {
        const lastEventId = stream.getLastEventId?.();
        if (lastEventId) cursorRef.current = lastEventId;
        if (activeStreamRef.current === stream) {
          if (current.askAbortRef.current === stream.cancel) {
            current.askAbortRef.current = null;
          }
          if (current.detachStreamRef.current === stream.destroy) {
            current.detachStreamRef.current = null;
          }
          activeStreamRef.current = undefined;
        }
      }
    },
    [updateState]
  );

  const recover = useCallback(
    async (params: RecoverOptions = {}) => {
      if (!optionsRef.current.conversationId || destroyedRef.current) return;
      if (suppressedRef.current || runningRef.current) return;

      const local = optionsRef.current.conversationRef.current;
      if (!params.pendingRequestId && !hasUnfinishedTurn(local)) {
        if (stateRef.current !== 'connected') updateState('connected');
        return;
      }
      if (!isOnline()) {
        if (hasUnfinishedTurn(local)) updateState('offline');
        return;
      }

      const generation = ++generationRef.current;
      const stale = () =>
        destroyedRef.current ||
        suppressedRef.current ||
        generationRef.current !== generation;
      runningRef.current = true;
      try {
        if (params.force) {
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
            const before = optionsRef.current.conversationRef.current;
            const leafBefore = activeLeaf(before);
            const requestId =
              params.pendingRequestId ??
              (isLocalRequestMessage(leafBefore) ? leafBefore?.id : undefined);

            // Read the server only to decide whether the turn is still
            // running. Merging its text here would make the resume below
            // replay events this page already shows.
            const snapshot = await optionsRef.current.loadSnapshot(
              snapshotQuery(before)
            );
            if (stale()) return;

            const localRequest = requestId
              ? before.mapping[requestId]
              : undefined;
            const resumeCursor =
              cursorOverride ?? cursorRef.current ?? resumeStreamCursor(before);

            if (!localRequest || !requestId) {
              if (!activeLeaf(snapshot) || isReplyComplete(snapshot)) {
                mergeSnapshot(snapshot);
                cursorRef.current = undefined;
                updateState('connected');
                return;
              }
              cursorOverride = undefined;
              await resumeOnce(resumeCursor);
              if (stale()) return;

              // A resume that ends without a terminal event means the server
              // no longer has this turn: report a real interruption instead
              // of leaving the bubble spinning forever.
              const after = await optionsRef.current.loadSnapshot(
                snapshotQuery(optionsRef.current.conversationRef.current)
              );
              if (stale()) return;
              mergeSnapshot(after);
              if (activeLeaf(after) && !isReplyComplete(after)) {
                markInterrupted(undefined, after);
                return;
              }
              cursorRef.current = undefined;
              updateState('connected');
              return;
            }

            // The page sent this question but never learned whether the server
            // took it. A resume replays the accepted `bos`, which carries the
            // client request ID, so the local bubble reconciles itself. The
            // question is never sent again.
            cursorOverride = undefined;
            await resumeOnce(resumeCursor);
            if (stale()) return;
            const current = optionsRef.current.conversationRef.current;
            const after = await optionsRef.current.loadSnapshot(
              snapshotQuery(current)
            );
            if (stale()) return;
            const accepted = findAcceptedRequest(after, localRequest);
            if (
              !accepted &&
              isLocalRequestMessage(current.mapping[requestId])
            ) {
              // Nothing on the server took this question. Keep the local
              // bubble so the user can retry it manually; never resend it
              // here.
              cursorRef.current = undefined;
              markUndelivered(requestId);
              return;
            }
            mergeSnapshot(after, requestId);
            if (activeLeaf(after) && !isReplyComplete(after)) {
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
                markInterrupted(error);
                return;
              }
              updateState('recovering');
              await delay(Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS));
              if (stale()) return;
              continue;
            }
            if (isUnavailable(error)) {
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
    cursorRef.current = undefined;
    suppressedRef.current = false;
    updateState('connected');
  }, [options.conversationId, updateState]);

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

  return { streamState, recover, reset, stop, track, untrack };
}
