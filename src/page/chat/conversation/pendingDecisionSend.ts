import {
  ChatMode,
  defaultRejectDecisions,
  type SendMessageParams,
} from '@/page/chat/chat-input/types';

import type { AskOutcome } from './utils';

export interface PendingDecision {
  // The assistant message waiting for decisions.
  messageId: string;
  // How many tool calls wait; one decision is needed for each.
  count: number;
}

export type SendTurnOutcome = AskOutcome & {
  // Images as uploaded by the first attempt, reused by a retry.
  images?: SendMessageParams['images'];
};

export type SendTurn = (
  params: SendMessageParams,
  parentId: string | undefined,
  options: { deferPendingInterrupt: boolean }
) => Promise<SendTurnOutcome | undefined>;

// The text was not sent because the pending decision could not be rejected
// first, or the user pressed Stop while it was being rejected. The caller
// keeps the draft so the user can send it again.
export class PendingDecisionNotRejected extends Error {
  constructor(
    readonly stopped: boolean,
    message = 'The pending decision was not rejected'
  ) {
    super(message);
  }
}

/**
 * Text sent while the branch waits for a tool decision does what the chat
 * bots do: reject every waiting call on a turn of its own (the turn records
 * the rejection and ends without a model reply), then send the text as a
 * normal ask after the rejected tool results.
 *
 * The text goes out only after the rejection succeeded, and continues from a
 * message the server created in that turn (the last tool result). If the
 * rejection fails or the user stops it, `abandon` cleans up and the text is
 * not sent. If another client already decided the interrupt, `alreadyDecided`
 * syncs to the newest message below it and the text is sent from there, once.
 *
 * `pending` is the decision the page knows about. When the page did not know
 * (it was raised in another client), the server refuses the ask with a
 * pending-interrupt error naming the message; that decision is rejected the
 * same way and the ask is sent once more. Never more than once.
 */
export async function sendRejectingPending({
  params,
  leafId,
  pending,
  send,
  discard,
  abandon,
  alreadyDecided,
  isStopped,
  decisionSettings,
}: {
  params: SendMessageParams;
  leafId: string | undefined;
  pending: PendingDecision | undefined;
  send: SendTurn;
  // Drops the local message of an attempt the server refused.
  discard: (outcome: SendTurnOutcome) => void;
  // Cleans up after a rejection that failed or was stopped; `nodeId` is the
  // interrupted message, a server message to sync from.
  abandon: (
    outcome: SendTurnOutcome | undefined,
    stopped: boolean,
    nodeId: string
  ) => Promise<void> | void;
  // Handles decisions refused because the interrupt was decided elsewhere and
  // returns the newest message below it.
  alreadyDecided: (
    outcome: SendTurnOutcome,
    nodeId: string
  ) => Promise<{ id: string; role?: string } | undefined>;
  isStopped: () => boolean;
  decisionSettings: Pick<SendMessageParams, 'edition' | 'level'>;
}): Promise<void> {
  const reject = async (decision: PendingDecision) => {
    const outcome = await send(
      {
        query: '',
        tools: [],
        selectedResources: [],
        mode: ChatMode.ASK,
        decisions: defaultRejectDecisions(decision.count),
        ...decisionSettings,
      },
      decision.messageId,
      { deferPendingInterrupt: false }
    );
    if (outcome?.alreadyDecided) {
      const latest = await alreadyDecided(outcome, decision.messageId);
      // Replying under a user message would make the server reuse it as the
      // question, so only continue from an assistant or tool message.
      if (latest && latest.role !== 'user' && !isStopped()) return latest.id;
      throw new PendingDecisionNotRejected(isStopped(), outcome.errorMessage);
    }
    const parentId =
      outcome && !outcome.failed ? outcome.lastMessageId : undefined;
    const stopped = isStopped();
    if (!parentId || stopped) {
      await abandon(outcome, stopped, decision.messageId);
      throw new PendingDecisionNotRejected(stopped, outcome?.errorMessage);
    }
    return parentId;
  };

  const parentId = pending ? await reject(pending) : leafId;
  const outcome = await send(params, parentId, {
    deferPendingInterrupt: !pending,
  });
  if (!outcome?.pendingInterrupt) return;
  discard(outcome);
  const rejectedLeaf = await reject(outcome.pendingInterrupt);
  await send(
    { ...params, images: outcome.images ?? params.images },
    rejectedLeaf,
    { deferPendingInterrupt: false }
  );
}
