import {
  ChatMode,
  DEFAULT_REJECT_REASON,
  type SendMessageParams,
} from '@/page/chat/chat-input/types';

import {
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

describe('sendRejectingPending', () => {
  it('rejects every waiting call, then asks after the rejected tool results', async () => {
    const { send, calls } = sender([
      { failed: false, lastMessageId: 'tool-2' },
      { failed: false, lastMessageId: 'answer' },
    ]);
    const discard = jest.fn();

    await sendRejectingPending({
      params,
      leafId: 'interrupt',
      pending: { messageId: 'interrupt', count: 2 },
      send,
      discard,
      decisionSettings: { edition: 'pro', level: 'high' },
    });

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
    expect(discard).not.toHaveBeenCalled();
  });

  it('asks normally when nothing waits', async () => {
    const { send, calls } = sender([{ failed: false, lastMessageId: 'a' }]);

    await sendRejectingPending({
      params,
      leafId: 'leaf',
      pending: undefined,
      send,
      discard: jest.fn(),
      decisionSettings: {},
    });

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
      {
        failed: true,
        pendingInterrupt: { messageId: 'third', count: 1 },
      },
    ]);
    const discard = jest.fn();

    await sendRejectingPending({
      params,
      leafId: 'leaf',
      pending: undefined,
      send,
      discard,
      decisionSettings: {},
    });

    expect(discard).toHaveBeenCalledWith(refused);
    expect(calls.map(([, parent, options]) => [parent, options])).toEqual([
      ['leaf', { deferPendingInterrupt: true }],
      ['other-interrupt', { deferPendingInterrupt: false }],
      ['tool-1', { deferPendingInterrupt: false }],
    ]);
    expect(calls[1][0].decisions).toEqual([reject]);
    expect(calls[2][0]).toEqual({ ...params, images: refused.images });
  });

  it('still sends the text when the rejection fails', async () => {
    const { send, calls } = sender([{ failed: true }, { failed: true }]);

    await sendRejectingPending({
      params,
      leafId: 'interrupt',
      pending: { messageId: 'interrupt', count: 1 },
      send,
      discard: jest.fn(),
      decisionSettings: {},
    });

    expect(calls[1]).toEqual([
      params,
      'interrupt',
      { deferPendingInterrupt: false },
    ]);
  });
});
