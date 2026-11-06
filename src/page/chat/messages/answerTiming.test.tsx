import { createInstance } from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';

import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';
import { AnswerDuration } from './AnswerDuration';
import { getAnswerTiming } from './answerTiming';

const answer = (
  duration: unknown = 8123,
  outcome = 'success'
): MessageDetail => ({
  id: 'answer',
  clientKey: 1,
  parent_id: 'query',
  children: [],
  status: outcome as MessageStatus,
  message: {
    role: OpenAIMessageRole.ASSISTANT,
    content: 'answer',
    reasoning_content: 'thinking',
  },
  attrs: {
    answer_timing: {
      version: 1,
      answer_id: 'answer',
      run_id: 'run',
      started_at: '2026-11-05T00:00:00Z',
      ended_at: '2026-11-05T00:00:08.123Z',
      previous_duration_ms: 0,
      duration_ms: duration,
      outcome,
    } as any,
  },
});

test('accepts a single-node server duration without inferring from message timestamps', () => {
  expect(getAnswerTiming(answer())?.duration_ms).toBe(8123);
  const old = answer();
  delete old.attrs?.answer_timing;
  old.created_at = '2026-11-05T00:00:00Z';
  old.updated_at = '2026-11-05T01:00:00Z';
  expect(getAnswerTiming(old)).toBeUndefined();
});

test.each([
  undefined,
  null,
  0,
  -1,
  NaN,
  Infinity,
  1.5,
  '8000',
  Number.MAX_SAFE_INTEGER + 1,
])('hides invalid duration %s', duration => {
  const message = answer();
  (message.attrs!.answer_timing as any).duration_ms = duration;
  expect(getAnswerTiming(message)).toBeUndefined();
});

test.each(['running', 'paused', 'unknown'])(
  'hides unfinished outcome %s',
  outcome => {
    expect(getAnswerTiming(answer(8000, outcome))).toBeUndefined();
  }
);

test('rejects unsupported versions, user messages and inconsistent status', () => {
  const message = answer();
  message.attrs!.answer_timing!.version = 2 as any;
  expect(getAnswerTiming(message)).toBeUndefined();
  const user = answer();
  user.message.role = OpenAIMessageRole.USER;
  expect(getAnswerTiming(user)).toBeUndefined();
  const streaming = answer();
  streaming.status = MessageStatus.STREAMING;
  expect(getAnswerTiming(streaming)).toBeUndefined();
});

test('shows a stop received between EOS and DONE without requiring a new body', () => {
  const stopped = answer(3000, 'stopped');
  stopped.status = MessageStatus.SUCCESS;
  stopped.attrs!.turn_status = 'stopped';
  expect(getAnswerTiming(stopped)?.outcome).toBe('stopped');
});

test.each([
  ['zh', 8123, 'success', '回答耗时 8 秒'],
  ['zh', 500, 'success', '回答耗时 不足 1 秒'],
  ['zh', 3601000, 'stopped', '已停止 · 耗时 1 小时 1 秒'],
  ['en', 65000, 'success', 'Response time: 1m 5s'],
  ['en', 500, 'failed', 'Failed · elapsed &lt;1s'],
])('renders %s %s %s', async (lng, duration, outcome, expected) => {
  const i18n = createInstance();
  await i18n.init({
    lng: String(lng),
    interpolation: { escapeValue: false },
    resources: { zh: { translation: zh }, en: { translation: en } },
  });
  const markup = renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <AnswerDuration message={answer(duration, String(outcome))} />
    </I18nextProvider>
  );
  expect(markup).toContain(expected);
});
