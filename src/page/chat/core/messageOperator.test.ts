import type { SetStateAction } from 'react';

import { createMessageOperator } from './messageOperator';
import { messageProcessor } from './messageProcessor';
import { MessageStatus, OpenAIMessageRole } from './types/chatResponse';
import type { ConversationDetail } from './types/conversation';

function updateConversation(
  conversation: ConversationDetail,
  updater: SetStateAction<ConversationDetail>
) {
  return typeof updater === 'function' ? updater(conversation) : updater;
}

describe('createMessageOperator', () => {
  it('handles missing messages and incomplete ancestor chains during streaming', () => {
    const conversation: ConversationDetail = {
      id: 'conversation',
      mapping: {
        assistant: {
          id: 'assistant',
          created_at: '2026-09-10T00:00:00.000Z',
          message: { role: OpenAIMessageRole.ASSISTANT },
          status: MessageStatus.STREAMING,
          parent_id: 'missing-user',
          children: [],
        },
      },
    };
    const operator = createMessageOperator(conversation, () => undefined);
    expect(operator.getParent('missing')).toBe('');
    expect(operator.getParent('assistant')).toBe('');
    expect(operator.getSiblings('missing')).toEqual([]);
    expect(operator.getSiblings('assistant')).toEqual([]);
    conversation.mapping['missing-user'] = {
      ...conversation.mapping.assistant,
      id: 'missing-user',
      parent_id: '',
      message: { role: OpenAIMessageRole.USER },
      children: ['assistant'],
    };
    expect(operator.getParent('assistant')).toBe('missing-user');
    expect(operator.getSiblings('assistant')).toEqual(['assistant']);
  });

  it('keeps terminal message status when attrs update later', () => {
    let conversation: ConversationDetail = {
      id: 'conversation',
      current_node: 'assistant',
      mapping: {
        assistant: {
          id: 'assistant',
          created_at: '2026-07-06T00:00:00.000Z',
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            content: 'Done',
          },
          status: MessageStatus.SUCCESS,
          parent_id: 'user',
          children: [],
        },
      },
    };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });

    operator.update({
      response_type: 'delta',
      message: {},
      attrs: { metrics: { tokens: 7, tps: 1.5 } },
    });

    expect(conversation.mapping.assistant.status).toBe(MessageStatus.SUCCESS);
    expect(conversation.mapping.assistant.attrs?.metrics).toEqual({
      tokens: 7,
      tps: 1.5,
    });
  });

  it('marks live tool messages even when the backend omitted tool_call attrs', () => {
    let conversation: ConversationDetail = {
      id: 'conversation',
      current_node: 'tool',
      mapping: {
        tool: {
          id: 'tool',
          created_at: '2026-07-06T00:00:00.000Z',
          message: {
            role: OpenAIMessageRole.TOOL,
            tool_call_id: 'tool-call',
          },
          status: MessageStatus.STREAMING,
          parent_id: 'assistant',
          children: [],
        },
      },
    };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });

    operator.done('tool');

    expect(conversation.mapping.tool.status).toBe(MessageStatus.SUCCESS);
    expect(conversation.mapping.tool.attrs?.tool_call).toEqual({
      in_streaming: true,
      status: 'success',
    });
  });
});

it('replaces the pending query with the persisted receipt without duplicating text or links', () => {
  let conversation: ConversationDetail = { id: 'conv', mapping: {} };
  const operator = createMessageOperator(conversation, updater => {
    conversation = updateConversation(conversation, updater);
  });
  operator.add({
    response_type: 'bos',
    id: 'local',
    role: OpenAIMessageRole.USER,
    created_at: '',
    parentId: '',
    attrs: { pending_query: true, client_request_id: 'local' },
  });
  operator.update(
    { response_type: 'delta', message: { content: 'hello' } },
    'local'
  );
  expect(conversation.mapping.local.message.content).toBe('hello');
  operator.add({
    response_type: 'bos',
    id: 'saved',
    role: OpenAIMessageRole.USER,
    created_at: '2026-09-12T02:30:00Z',
    parentId: '',
    attrs: { client_request_id: 'local' },
  });
  operator.update(
    { response_type: 'delta', message: { content: 'hello' } },
    'saved'
  );
  operator.done('saved');
  expect(Object.keys(conversation.mapping)).toEqual(['saved']);
  expect(conversation.mapping.saved.message.content).toBe('hello');
  expect(conversation.mapping.saved.status).toBe(MessageStatus.SUCCESS);
  expect(conversation.current_node).toBe('saved');
});

it.each(['done', 'stop', 'add'] as const)(
  'clears stale error details when a message transitions through %s',
  transition => {
    let conversation: ConversationDetail = { id: 'c', mapping: {} };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });
    const bos = {
      response_type: 'bos' as const,
      id: 'm',
      parentId: '',
      role: OpenAIMessageRole.ASSISTANT,
    };
    operator.add(bos);
    operator.error(
      {
        response_type: 'error',
        message: '',
        code: 'CONVERSATION_BUSY',
        status: 409,
      },
      'm'
    );
    expect(conversation.mapping.m.attrs).toMatchObject({
      error_message: 'Unknown error',
      error_code: 'CONVERSATION_BUSY',
      error_status: 409,
    });
    if (transition === 'stop') {
      // A resumed active message can still carry a stale server snapshot.
      conversation.mapping.m.status = MessageStatus.STREAMING;
    }
    if (transition === 'add') operator.add(bos);
    else operator[transition]('m');
    expect(conversation.mapping.m.attrs?.error_message).toBeUndefined();
    expect(conversation.mapping.m.attrs?.error_code).toBeUndefined();
    expect(conversation.mapping.m.attrs?.error_status).toBeUndefined();
  }
);
test('stopping a captured tool does not stop a newer turn or accept late EOS', () => {
  let conversation = {
    id: 'c',
    current_node: 'a2',
    mapping: {},
  } as ConversationDetail;
  const row = (
    id: string,
    parent_id: string,
    role: OpenAIMessageRole,
    status: MessageStatus
  ) => ({
    id,
    clientKey: 0,
    parent_id,
    children: [],
    message: { role },
    status,
  });
  conversation.mapping = {
    q: row('q', '', OpenAIMessageRole.USER, MessageStatus.SUCCESS),
    a: row('a', 'q', OpenAIMessageRole.ASSISTANT, MessageStatus.SUCCESS),
    t: row('t', 'a', OpenAIMessageRole.TOOL, MessageStatus.STREAMING),
    q2: row('q2', 't', OpenAIMessageRole.USER, MessageStatus.SUCCESS),
    a2: row('a2', 'q2', OpenAIMessageRole.ASSISTANT, MessageStatus.STREAMING),
  };
  const operator = createMessageOperator(conversation, update => {
    conversation = typeof update === 'function' ? update(conversation) : update;
  });
  operator.stop('t');
  operator.done('t');
  operator.update(
    { response_type: 'delta', message: { content: 'late' } },
    't'
  );
  expect(conversation.mapping.t.status).toBe(MessageStatus.STOPPED);
  expect(conversation.mapping.t.message.content).toBeUndefined();
  expect(conversation.mapping.a2.status).toBe(MessageStatus.STREAMING);
  expect(conversation.mapping.a.status).toBe(MessageStatus.SUCCESS);
  expect(conversation.mapping.a.attrs?.turn_status).toBe('stopped');
});

test('stop acknowledgement includes TOOL descendants created while cancellation was pending', () => {
  let conversation = {
    id: 'c',
    current_node: 't',
    mapping: {
      q: {
        id: 'q',
        parent_id: '',
        children: ['a'],
        message: { role: OpenAIMessageRole.USER },
        status: MessageStatus.SUCCESS,
      },
      a: {
        id: 'a',
        parent_id: 'q',
        children: ['t'],
        message: { role: OpenAIMessageRole.ASSISTANT },
        status: MessageStatus.SUCCESS,
      },
      t: {
        id: 't',
        parent_id: 'a',
        children: [],
        message: { role: OpenAIMessageRole.TOOL },
        status: MessageStatus.STREAMING,
      },
    },
  } as unknown as ConversationDetail;
  const operator = createMessageOperator(conversation, update => {
    conversation = typeof update === 'function' ? update(conversation) : update;
  });
  operator.stop('a');
  expect(conversation.mapping.t.status).toBe(MessageStatus.STOPPED);
});

it.each([MessageStatus.FAILED, MessageStatus.STOPPED])(
  'keeps %s terminal after late timing metadata and EOS',
  status => {
    let conversation: ConversationDetail = {
      id: 'c',
      current_node: 'answer',
      mapping: {
        answer: {
          id: 'answer',
          clientKey: 1,
          parent_id: '',
          children: [],
          status,
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'partial' },
          attrs: {
            answer_timing: {
              version: 1,
              answer_id: 'answer',
              run_id: 'run',
              status: status === MessageStatus.FAILED ? 'failed' : 'stopped',
              started_at: '2026-11-09T00:00:00Z',
              completed_at: '2026-11-09T00:00:02Z',
            },
          },
        },
      },
    };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });
    operator.update(
      {
        response_type: 'delta',
        message: {},
        attrs: {
          answer_timing: {
            version: 1,
            answer_id: 'answer',
            run_id: 'run',
            status: 'running',
            started_at: '2026-11-09T00:00:00Z',
          },
        },
      },
      'answer'
    );
    operator.done('answer');
    expect(conversation.mapping.answer.status).toBe(status);
    expect(conversation.mapping.answer.message.content).toBe('partial');
    expect(conversation.mapping.answer.attrs?.answer_timing?.status).toBe(
      status
    );
  }
);

test('replays metadata-only deltas on the addressed branch without changing text or the active sibling', () => {
  const answerTiming = {
    version: 1,
    answer_id: 'a',
    run_id: 'run-a',
    status: 'complete',
    started_at: '2026-11-09T00:00:00Z',
    completed_at: '2026-11-09T00:01:00Z',
    duration_ms: 8000,
  };
  let conversation: ConversationDetail = {
    id: 'c',
    current_node: 'b',
    mapping: {
      a: {
        id: 'a',
        clientKey: 1,
        parent_id: 'q',
        children: [],
        status: MessageStatus.SUCCESS,
        message: {
          role: OpenAIMessageRole.ASSISTANT,
          content: 'first answer',
          reasoning_content: 'reasoning',
        },
      },
      b: {
        id: 'b',
        clientKey: 2,
        parent_id: 'q',
        children: [],
        status: MessageStatus.SUCCESS,
        message: { role: OpenAIMessageRole.ASSISTANT, content: 'other answer' },
      },
    },
  };
  const operator = createMessageOperator(conversation, updater => {
    conversation = updateConversation(conversation, updater);
  });
  const metadata = JSON.stringify({
    response_type: 'delta',
    id: 'a',
    message: {},
    attrs: { answer_timing: answerTiming },
  });
  messageProcessor(operator, metadata);
  messageProcessor(operator, metadata);
  messageProcessor(operator, JSON.stringify({ response_type: 'done' }));
  expect(conversation.mapping.a.attrs?.answer_timing).toEqual(answerTiming);
  expect(conversation.mapping.a.status).toBe(MessageStatus.SUCCESS);
  expect(conversation.mapping.a.message).toMatchObject({
    content: 'first answer',
    reasoning_content: 'reasoning',
  });
  expect(conversation.mapping.b.attrs?.answer_timing).toBeUndefined();
  expect(conversation.current_node).toBe('b');
});

it.each(['paused', 'complete', 'stopped', 'failed'] as const)(
  'keeps %s timing through stale running delta and repeated BOS',
  timingStatus => {
    const timing = {
      version: 1 as const,
      answer_id: 'answer',
      run_id: 'run',
      started_at: '2026-11-09T00:00:00Z',
      status: timingStatus,
      ...(timingStatus === 'paused'
        ? { duration_ms: 2000 }
        : { completed_at: '2026-11-09T00:00:05Z' }),
      ...(timingStatus === 'complete' ? { duration_ms: 3000 } : {}),
    };
    let conversation = {
      id: 'c',
      current_node: 'answer',
      mapping: {
        answer: {
          id: 'answer',
          clientKey: 1,
          parent_id: '',
          children: [],
          status: MessageStatus.SUCCESS,
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer' },
          attrs: { answer_timing: timing },
        },
      },
    } as unknown as ConversationDetail;
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });
    const running = {
      version: 1 as const,
      answer_id: 'answer',
      run_id: 'run',
      started_at: timing.started_at,
      status: 'running' as const,
    };
    operator.update(
      {
        response_type: 'delta',
        message: {},
        attrs: { answer_timing: running },
      },
      'answer'
    );
    expect(conversation.mapping.answer.attrs?.answer_timing).toEqual(timing);
    operator.add({
      response_type: 'bos',
      id: 'answer',
      role: OpenAIMessageRole.ASSISTANT,
      parentId: '',
      attrs: { answer_timing: running },
    });
    expect(conversation.mapping.answer.attrs?.answer_timing).toEqual(timing);
    expect(conversation.mapping.answer.status).toBe(MessageStatus.SUCCESS);
  }
);

it.each(['answer_id', 'run_id', 'started_at'] as const)(
  'rejects a timing delta bound to another %s',
  key => {
    const timing = {
      version: 1 as const,
      answer_id: 'answer',
      run_id: 'run',
      started_at: '2026-11-09T00:00:00Z',
      status: 'running' as const,
    };
    let conversation: ConversationDetail = {
      id: 'c',
      current_node: 'answer',
      mapping: {
        answer: {
          id: 'answer',
          clientKey: 1,
          parent_id: '',
          children: [],
          status: MessageStatus.STREAMING,
          message: { role: OpenAIMessageRole.ASSISTANT },
          attrs: { answer_timing: timing },
        },
      },
    };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });
    operator.update(
      {
        response_type: 'delta',
        message: {},
        attrs: {
          answer_timing: {
            ...timing,
            status: 'complete',
            completed_at: '2026-11-09T00:00:05Z',
            duration_ms: 5000,
            [key]: key === 'started_at' ? '2026-11-09T00:00:01Z' : 'other',
          },
        },
      },
      'answer'
    );
    expect(conversation.mapping.answer.attrs?.answer_timing).toEqual(timing);
  }
);

it('accepts server stopped timing after a local stop without accepting late content', () => {
  const running = {
    version: 1 as const,
    answer_id: 'answer',
    run_id: 'run',
    started_at: '2026-11-09T00:00:00Z',
    status: 'running' as const,
  };
  let conversation: ConversationDetail = {
    id: 'c',
    current_node: 'answer',
    mapping: {
      answer: {
        id: 'answer',
        clientKey: 1,
        parent_id: '',
        children: [],
        status: MessageStatus.STOPPED,
        message: { role: OpenAIMessageRole.ASSISTANT, content: 'partial' },
        attrs: { answer_timing: running },
      },
    },
  };
  const operator = createMessageOperator(conversation, updater => {
    conversation = updateConversation(conversation, updater);
  });
  const stopped = {
    ...running,
    status: 'stopped' as const,
    completed_at: '2026-11-09T00:00:05Z',
  };
  operator.update(
    {
      response_type: 'delta',
      message: { content: 'late content' },
      attrs: { answer_timing: stopped },
    },
    'answer'
  );
  expect(conversation.mapping.answer.attrs?.answer_timing).toEqual(stopped);
  expect(conversation.mapping.answer.message.content).toBe('partial');
  expect(conversation.mapping.answer.status).toBe(MessageStatus.STOPPED);
});

it.each(['missing', 'running', 'complete'] as const)(
  'recovers local stream_interrupted on EOS with %s timing',
  timingState => {
    let conversation: ConversationDetail = { id: 'c', mapping: {} };
    const operator = createMessageOperator(conversation, updater => {
      conversation = updateConversation(conversation, updater);
    });
    const running = {
      version: 1 as const,
      answer_id: 'answer',
      run_id: 'run',
      started_at: '2026-11-09T00:00:00Z',
      status: 'running' as const,
    };
    operator.add({
      response_type: 'bos',
      id: 'answer',
      role: OpenAIMessageRole.ASSISTANT,
      parentId: '',
      attrs: timingState === 'missing' ? undefined : { answer_timing: running },
    });
    operator.update(
      { response_type: 'delta', message: { content: 'partial answer' } },
      'answer'
    );
    operator.error(
      {
        response_type: 'error',
        code: 'stream_interrupted',
        message: 'Connection interrupted',
      },
      'answer'
    );
    expect(conversation.mapping.answer.status).toBe(MessageStatus.FAILED);
    if (timingState === 'complete') {
      operator.update(
        {
          response_type: 'delta',
          message: {},
          attrs: {
            answer_timing: {
              ...running,
              status: 'complete',
              completed_at: '2026-11-09T00:00:02Z',
              duration_ms: 2000,
            },
          },
        },
        'answer'
      );
    }
    operator.done('answer');
    expect(conversation.mapping.answer.status).toBe(MessageStatus.SUCCESS);
    expect(conversation.mapping.answer.message.content).toBe('partial answer');
    expect(conversation.mapping.answer.attrs?.error_code).toBeUndefined();
    expect(conversation.mapping.answer.attrs?.error_message).toBeUndefined();
  }
);
