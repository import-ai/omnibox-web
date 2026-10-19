import {
  ChatMode,
  DEFAULT_REJECT_REASON,
  type SendMessageParams,
} from '@/page/chat/chat-input/types';

import {
  PendingDecisionNotRejected,
  sendRejectingPending,
  type SendTurn,
  type SendTurnOutcome,
} from './pendingDecisionSend';

const params: SendMessageParams = {
  query: '用一句话介绍北京',
  tools: [],
  selectedResources: [{ type: 'resource', resource: { id: 'r1' } } as never],
  mode: ChatMode.ASK,
  images: [{ id: 'img', name: 'a.png', url: 'blob:a', file: {} as File }],
};

const reject = {
  type: 'reject',
  message: DEFAULT_REJECT_REASON,
  end_turn: true,
};

function sender(outcomes: (SendTurnOutcome | undefined)[]) {
  const calls: Parameters<SendTurn>[] = [];
  const send: SendTurn = async (...args) => {
    calls.push(args);
    return outcomes.shift();
  };
  return { send, calls };
}

function run(
  send: SendTurn,
  pending: { messageId: string; count: number } | undefined,
  overrides: Partial<Parameters<typeof sendRejectingPending>[0]> = {}
) {
  const discard = jest.fn();
  const abandon = jest.fn();
  const alreadyDecided = jest.fn().mockResolvedValue(undefined);
  const promise = sendRejectingPending({
    params,
    leafId: pending?.messageId ?? 'leaf',
    pending,
    send,
    discard,
    abandon,
    alreadyDecided,
    isStopped: () => false,
    decisionSettings: {},
    ...overrides,
  });
  return { promise, discard, abandon, alreadyDecided };
}

describe('sendRejectingPending', () => {
  it('rejects every waiting call, then asks after the rejected tool results', async () => {
    const { send, calls } = sender([
      { failed: false, lastMessageId: 'tool-2' },
      { failed: false, lastMessageId: 'answer' },
    ]);

    const { promise, abandon } = run(
      send,
      { messageId: 'interrupt', count: 2 },
      { decisionSettings: { edition: 'pro', level: 'high' } }
    );
    await promise;

    expect(calls).toEqual([
      [
        {
          query: '',
          tools: [],
          selectedResources: [],
          mode: ChatMode.ASK,
          decisions: [reject, reject],
          edition: 'pro',
          level: 'high',
        },
        'interrupt',
        { deferPendingInterrupt: false },
      ],
      [params, 'tool-2', { deferPendingInterrupt: false }],
    ]);
    expect(abandon).not.toHaveBeenCalled();
  });

  it('asks normally when nothing waits', async () => {
    const { send, calls } = sender([{ failed: false, lastMessageId: 'a' }]);

    await run(send, undefined).promise;

    expect(calls).toEqual([[params, 'leaf', { deferPendingInterrupt: true }]]);
  });

  it('rejects a decision the server reports, then asks once more', async () => {
    const refused: SendTurnOutcome = {
      failed: true,
      requestId: 'local-1',
      pendingInterrupt: { messageId: 'other-interrupt', count: 1 },
      images: [{ attachment_id: 'att', name: 'a.png', url: '/a' }],
    };
    const { send, calls } = sender([
      refused,
      { failed: false, lastMessageId: 'tool-1' },
      // A second refusal is shown as an error, not retried.
      { failed: true, pendingInterrupt: { messageId: 'third', count: 1 } },
    ]);

    const { promise, discard } = run(send, undefined);
    await promise;

    expect(discard).toHaveBeenCalledWith(refused);
    expect(calls.map(([, parent, options]) => [parent, options])).toEqual([
      ['leaf', { deferPendingInterrupt: true }],
      ['other-interrupt', { deferPendingInterrupt: false }],
      ['tool-1', { deferPendingInterrupt: false }],
    ]);
    expect(calls[1][0].decisions).toEqual([reject]);
    expect(calls[2][0]).toEqual({ ...params, images: refused.images });
  });

  it.each([
    ['fails', { failed: true, requestId: 'local-d', errorMessage: '503' }],
    [
      'creates no tool result to continue from',
      { failed: false, requestId: 'local-d' },
    ],
  ])(
    'keeps the text when the rejection %s',
    async (_case, outcome: SendTurnOutcome) => {
      const { send, calls } = sender([outcome]);

      const { promise, abandon } = run(send, {
        messageId: 'interrupt',
        count: 1,
      });

      await expect(promise).rejects.toEqual(
        expect.objectContaining({ stopped: false })
      );
      await expect(promise).rejects.toBeInstanceOf(PendingDecisionNotRejected);
      expect(calls).toHaveLength(1);
      expect(abandon).toHaveBeenCalledWith(outcome, false, 'interrupt');
    }
  );

  it('drops the text when the user stops during the rejection', async () => {
    const rejected = { failed: false, lastMessageId: 'tool-1' };
    const { send, calls } = sender([rejected]);

    const { promise, abandon } = run(
      send,
      { messageId: 'interrupt', count: 1 },
      { isStopped: () => true }
    );

    await expect(promise).rejects.toEqual(
      expect.objectContaining({ stopped: true })
    );
    expect(calls).toHaveLength(1);
    expect(abandon).toHaveBeenCalledWith(rejected, true, 'interrupt');
  });

  it('sends the text once from where another client left the decided interrupt', async () => {
    const decided = {
      failed: true,
      alreadyDecided: true,
      requestId: 'local-d',
    };
    const { send, calls } = sender([decided, { failed: false }]);
    const alreadyDecided = jest
      .fn()
      .mockResolvedValue({ id: 'answer-x', role: 'assistant' });

    const { promise, abandon } = run(
      send,
      { messageId: 'interrupt', count: 1 },
      { alreadyDecided }
    );
    await promise;

    expect(alreadyDecided).toHaveBeenCalledWith(decided, 'interrupt');
    expect(abandon).not.toHaveBeenCalled();
    expect(calls.map(([, parent]) => parent)).toEqual([
      'interrupt',
      'answer-x',
    ]);
    expect(calls[1][0]).toBe(params);
  });

  it('keeps the text when the decided interrupt leads to an unanswered question', async () => {
    const { send, calls } = sender([{ failed: true, alreadyDecided: true }]);

    const { promise } = run(
      send,
      { messageId: 'interrupt', count: 1 },
      {
        alreadyDecided: jest
          .fn()
          .mockResolvedValue({ id: 'question', role: 'user' }),
      }
    );

    await expect(promise).rejects.toBeInstanceOf(PendingDecisionNotRejected);
    expect(calls).toHaveLength(1);
  });
});
