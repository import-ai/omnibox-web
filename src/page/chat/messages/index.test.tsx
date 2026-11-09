import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { MessageOperator } from '../core/messageOperator';
import type { Citation } from '../core/types/chatResponse';
import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type {
  ConversationDetail,
  MessageAttrs,
  MessageDetail,
} from '../core/types/conversation';
import { Messages } from './index';
let mockLanguage = 'en';
let mockChatOnly = false;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values: Record<string, string | number> = {}) => {
      if (!key.startsWith('chat.messages.process.')) return key;
      const locale = require(`@/i18n/locales/${mockLanguage}.json`);
      const value = key
        .split('.')
        .reduce((item: any, part) => item?.[part], locale);
      return typeof value === 'string'
        ? value.replace(/{{(\w+)}}/g, (_, name) => String(values[name]))
        : key;
    },
  }),
}));
jest.mock('@/page/share/ShareChatOnlyContext', () => ({
  useShareChatOnly: () => mockChatOnly,
}));
jest.mock('@/page/chat/messages/role/AssistantMessage', () => ({
  AssistantMessage: ({ citations }: { citations: Citation[] }) => (
    <output>{JSON.stringify(citations)}</output>
  ),
}));
jest.mock('@/page/chat/messages/role/ToolMessage', () => ({
  ToolMessage: () => null,
}));
jest.mock('@/page/chat/messages/role/UserMessage', () => ({
  UserMessage: () => null,
}));
jest.mock('@/page/chat/share/ConversationShareMessageRow', () => ({
  ConversationShareMessageRow: ({ children }: { children: React.ReactNode }) =>
    children,
}));
const node = (
  id: string,
  extra: Partial<MessageDetail> = {}
): MessageDetail => ({
  id,
  clientKey: 1,
  children: [],
  parent_id: '',
  status: MessageStatus.SUCCESS,
  message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer' },
  ...extra,
});

test('streamed citations remain visible after paginated bootstrap', () => {
  const citation = {
    id: 'C1',
    title: 'source',
    link: 'https://example.com',
    snippet: 'full',
  };
  const tool = node('tool', {
    message: { role: OpenAIMessageRole.TOOL },
    attrs: { citations: [citation] },
  });
  const answer = node('answer', {
    status: MessageStatus.STREAMING,
    message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer [[1]]' },
  });
  const conversation: ConversationDetail = {
    id: 'c',
    citations: [],
    current_node: 'answer',
    mapping: { tool, answer },
  };
  const html = renderToStaticMarkup(
    <Messages
      conversation={conversation}
      messages={[tool, answer]}
      messageOperator={
        { getParent: () => undefined } as unknown as MessageOperator
      }
      onEdit={() => {}}
      onRegenerate={() => {}}
    />
  );
  expect(html).toContain('C1');
});

test.each([
  ['Software caused connection abort', undefined, 'connection_interrupted'],
  ['provider detail', undefined, 'unknown'],
  ['', 'CONVERSATION_BUSY', 'busy'],
  [undefined, undefined, 'unknown'],
])(
  'localizes failed message %s without rendering its raw details',
  (message, code, key) => {
    const failed = node('failed', {
      status: MessageStatus.FAILED,
      attrs: { error_message: message, error_code: code },
    });
    const html = renderToStaticMarkup(
      <Messages
        conversation={{ id: 'c', mapping: { failed } }}
        messages={[failed]}
        messageOperator={
          { getParent: () => undefined } as unknown as MessageOperator
        }
        onEdit={() => {}}
        onRegenerate={() => {}}
      />
    );
    expect(html).toContain(`chat.errors.${key}`);
    if (message) expect(html).not.toContain(message);
  }
);

const timing = (extra: Record<string, unknown> = {}) => ({
  version: 1,
  answer_id: 'first-assistant',
  run_id: 'run-1',
  status: 'complete',
  started_at: '2026-11-09T00:00:00.000Z',
  completed_at: '2026-11-09T00:10:00.000Z',
  duration_ms: 68000,
  ...extra,
});

function timedAnswer(
  extra: Record<string, unknown> = {},
  overrides: Partial<MessageDetail> = {}
) {
  return node('answer', {
    message: {
      role: OpenAIMessageRole.ASSISTANT,
      content: 'answer',
      reasoning_content: 'reasoning',
    },
    attrs: { answer_timing: timing(extra) } as unknown as MessageAttrs,
    ...overrides,
  });
}

function renderAnswer(messages: MessageDetail[]) {
  return renderToStaticMarkup(
    <Messages
      conversation={{
        id: 'c',
        mapping: Object.fromEntries(
          messages.map(message => [message.id, message])
        ),
      }}
      messages={messages}
      messageOperator={
        { getParent: () => undefined } as unknown as MessageOperator
      }
      onEdit={() => {}}
      onRegenerate={() => {}}
    />
  );
}

afterEach(() => {
  mockLanguage = 'en';
  mockChatOnly = false;
});

test('reuses the closed process disclosure above a single reasoning answer', () => {
  const html = renderAnswer([timedAnswer()]);
  expect(html).toContain('1m 8s');
  expect(html.indexOf('<summary')).toBeLessThan(html.indexOf('<output>'));
  expect(html).not.toContain('Response time');
  expect(html).not.toContain('回答耗时');
});

test('shows the same top-level summary for lazy reasoning history without loading details', () => {
  const html = renderAnswer([
    timedAnswer(
      {},
      {
        details_loaded: false,
        has_reasoning: true,
        message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer' },
      }
    ),
  ]);
  expect(html).toContain('1m 8s');
});

test('uses one answer summary for multiple tool steps and final reasoning', () => {
  const html = renderAnswer([
    node('tool-1', {
      created_at: '2026-11-09T00:00:00Z',
      message: { role: OpenAIMessageRole.TOOL },
      attrs: {
        answer_timing: timing({ duration_ms: 1000 }),
      } as unknown as MessageAttrs,
    }),
    node('tool-2', { message: { role: OpenAIMessageRole.TOOL } }),
    timedAnswer({}, { created_at: '2026-11-09T00:30:00Z' }),
  ]);
  expect(html).toContain('1m 8s');
  expect(html.match(/<summary/g)).toHaveLength(1);
  expect(html.indexOf('<summary')).toBeLessThan(html.indexOf('<output>'));
  expect(html).not.toContain('Response time');
  expect(html).not.toContain('回答耗时');
});

test.each([
  ['en', 'Less than 1 second'],
  ['zh', '不足 1 秒'],
])('localizes positive subsecond durations in %s', (language, expected) => {
  mockLanguage = language;
  expect(renderAnswer([timedAnswer({ duration_ms: 50 })])).toContain(expected);
});

test.each([
  undefined,
  {},
  { duration_ms: undefined },
  { duration_ms: 0 },
  { duration_ms: -1 },
  { duration_ms: NaN },
  { duration_ms: Infinity },
  { duration_ms: Number.MAX_SAFE_INTEGER + 1 },
  { duration_ms: '68000' },
  { duration_ms: 0.5 },
  { version: 2 },
  { answer_id: '' },
  { run_id: ' ' },
  { started_at: 'invalid' },
  { completed_at: undefined },
  { completed_at: 'invalid' },
  { completed_at: '2026-11-08T00:00:00Z' },
  { status: 'running' },
  { status: 'paused' },
])('shows unavailable for missing or invalid final timing %#', invalid => {
  const answer =
    invalid === undefined
      ? timedAnswer({}, { attrs: undefined })
      : invalid && Object.keys(invalid).length === 0
        ? timedAnswer(
            {},
            { attrs: { answer_timing: {} } as unknown as MessageAttrs }
          )
        : timedAnswer(invalid);
  expect(renderAnswer([answer])).toContain('Duration unavailable');
});

test('does not estimate legacy multi-step duration from creation or update timestamps', () => {
  const html = renderAnswer([
    node('tool', {
      created_at: '2026-11-09T00:00:00Z',
      message: { role: OpenAIMessageRole.TOOL },
    }),
    timedAnswer(
      {},
      {
        attrs: undefined,
        created_at: '2026-11-09T00:01:08Z',
        updated_at: '2026-11-09T00:30:00Z',
      }
    ),
  ]);
  expect(html).toContain('Duration unavailable');
});

test.each([
  MessageStatus.STOPPED,
  MessageStatus.FAILED,
  MessageStatus.STREAMING,
  MessageStatus.PENDING,
])('does not show completed-answer time for %s messages', status => {
  const html = renderAnswer([timedAnswer({}, { status })]);
  expect(html).not.toContain('Response time');
  expect(html).not.toContain('Duration unavailable');
});

test('preserves stopped process folding without claiming a completed duration', () => {
  const html = renderAnswer([
    node('tool', { message: { role: OpenAIMessageRole.TOOL } }),
    timedAnswer({}, { status: MessageStatus.STOPPED }),
  ]);
  expect(html).toContain('Process details');
  expect(html).not.toContain('Response time');
});

test('leaves an ordinary single answer unchanged even if timing exists', () => {
  expect(
    renderAnswer([
      timedAnswer(
        {},
        {
          message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer' },
        }
      ),
    ])
  ).not.toContain('Response time');
});

test('renders each selected branch using its own answer timing', () => {
  const first = timedAnswer({ answer_id: 'a', duration_ms: 2000 });
  const second = timedAnswer({
    answer_id: 'b',
    run_id: 'run-2',
    duration_ms: 9000,
  });
  expect(renderAnswer([first])).toContain('2s');
  expect(renderAnswer([second])).toContain('9s');
});

test('formats hours, minutes and seconds from active time despite a longer wall time', () => {
  const html = renderAnswer([
    timedAnswer({ duration_ms: 3661000, completed_at: '2026-11-09T02:00:00Z' }),
  ]);
  expect(html).toContain('1h 1m 1s');
});

test('localizes unavailable timing without inventing zero seconds', () => {
  mockLanguage = 'zh';
  expect(renderAnswer([timedAnswer({}, { attrs: undefined })])).toContain(
    '耗时不可用'
  );
});

test('does not show time on an earlier successful message in a stopped turn', () => {
  const answer = timedAnswer();
  answer.attrs!.turn_status = 'stopped';
  expect(renderAnswer([answer])).not.toContain('Response time');
});

test('preserves the same duration summary on a chat-only share', () => {
  mockChatOnly = true;
  expect(renderAnswer([timedAnswer()])).toContain('1m 8s');
});

test.each(['stopped', 'failed'])(
  'does not show a completion summary for %s timing before terminal message status arrives',
  status => {
    expect(
      renderAnswer([timedAnswer({ status, duration_ms: undefined })])
    ).not.toContain('Response time');
  }
);

test('single reasoning uses the original disclosure and only one final answer anchor', () => {
  const html = renderAnswer([timedAnswer()]);
  expect(html).toContain('<details');
  expect(html).toContain('<summary');
  expect(html.match(/id="message-answer"/g)).toHaveLength(1);
  expect(html.match(/<output>/g)).toHaveLength(1);
  expect(html).not.toContain('Response time');
});
