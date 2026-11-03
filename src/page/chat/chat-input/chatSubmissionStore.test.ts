/** @jest-environment jsdom */

import {
  beginChatSubmissionPreparation,
  isChatSubmissionPreparing,
  useChatSubmissionStore,
} from './chatSubmissionStore';

beforeEach(() => {
  localStorage.clear();
  useChatSubmissionStore.setState({ pending: {} });
});

it('rejects duplicate preparations and does not let an old cleanup unlock a new one', () => {
  const finish = beginChatSubmissionPreparation(
    'namespace-a',
    'conversation-a'
  )!;
  expect(
    beginChatSubmissionPreparation('namespace-a', 'conversation-a')
  ).toBeUndefined();
  expect(isChatSubmissionPreparing('namespace-a')).toBe(true);
  finish();
  const finishNext = beginChatSubmissionPreparation(
    'namespace-a',
    'conversation-a'
  )!;
  finish();
  expect(isChatSubmissionPreparing('namespace-a')).toBe(true);
  finishNext();
  expect(isChatSubmissionPreparing('namespace-a')).toBe(false);
});

it('keeps a namespace blocked until every scoped preparation finishes', () => {
  const finishA = beginChatSubmissionPreparation(
    'namespace-a',
    'conversation-a'
  )!;
  const finishB = beginChatSubmissionPreparation(
    'namespace-a',
    'home:namespace-a'
  )!;
  const finishOther = beginChatSubmissionPreparation(
    'namespace-b',
    'conversation-a'
  )!;
  finishA();
  expect(isChatSubmissionPreparing('namespace-a')).toBe(true);
  finishB();
  expect(isChatSubmissionPreparing('namespace-a')).toBe(false);
  expect(isChatSubmissionPreparing('namespace-b')).toBe(true);
  finishOther();
});

it('isolates accounts and releases only the captured account preparation', () => {
  localStorage.setItem('uid', 'user-a');
  const finishA = beginChatSubmissionPreparation(
    'namespace-a',
    'conversation-a'
  )!;
  localStorage.setItem('uid', 'user-b');
  expect(isChatSubmissionPreparing('namespace-a')).toBe(false);
  const finishB = beginChatSubmissionPreparation(
    'namespace-a',
    'conversation-a'
  )!;
  finishA();
  expect(isChatSubmissionPreparing('namespace-a')).toBe(true);
  finishB();
  expect(isChatSubmissionPreparing('namespace-a')).toBe(false);
});
