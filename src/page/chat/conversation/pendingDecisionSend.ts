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

/**
 * Text sent while the branch waits for a tool decision does what the chat
 * bots do: reject every waiting call on a turn of its own (the turn records
 * the rejection and ends without a model reply), then send the text as a
 * normal ask after the rejected tool results.
 *
 * `pending` is the decision the page knows about. When the page did not know
 * (it was raised in another client after loading), the server refuses the ask
 * with a pending-interrupt error naming the message; that decision is rejected
 * the same way and the ask is sent once more. Never more than once.
 */
export async function sendRejectingPending({
  params,
  leafId,
  pending,
  send,
  discard,
  decisionSettings,
}: {
  params: SendMessageParams;
  leafId: string | undefined;
  pending: PendingDecision | undefined;
  send: SendTurn;
  // Drops the local message of an attempt the server refused.
  discard: (outcome: SendTurnOutcome) => void;
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
    if (!outcome || outcome.failed) return undefined;
    return outcome.lastMessageId ?? decision.messageId;
  };

  let parentId = leafId;
  if (pending) {
    // If the rejection fails, still send the text: it then shows as a failed
    // message the user can retry, instead of disappearing.
    parentId = (await reject(pending)) ?? leafId;
  }
  const outcome = await send(params, parentId, {
    deferPendingInterrupt: !pending,
  });
  if (!outcome?.pendingInterrupt) return;
  discard(outcome);
  const rejectedLeaf = await reject(outcome.pendingInterrupt);
  await send(
    { ...params, images: outcome.images ?? params.images },
    rejectedLeaf ?? outcome.pendingInterrupt.messageId,
    { deferPendingInterrupt: false }
  );
}
