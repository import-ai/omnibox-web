/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '../core/types/conversation';
import { useConversationShare } from '../share/useConversationShare';
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
jest.mock('@/service/conversationShare', () => ({
  createConversationShare: jest.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('select all from an indeterminate branch selects all answers', () => {
  const messages: MessageDetail[] = ['1', '2'].flatMap(id => [
    {
      id: `u${id}`,
      clientKey: 1,
      parent_id: '',
      children: [],
      status: MessageStatus.SUCCESS,
      message: { role: OpenAIMessageRole.USER, content: 'q' },
    },
    {
      id: `a${id}`,
      clientKey: 2,
      parent_id: `u${id}`,
      children: [],
      status: MessageStatus.SUCCESS,
      message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer' },
    },
  ]);
  const conversation: ConversationDetail = {
    id: 'c',
    branch_leaf_id: 'a2',
    shareable_total: 2,
    mapping: {},
  };
  let share: ReturnType<typeof useConversationShare>;
  function Harness() {
    share = useConversationShare({
      conversation,
      messages,
      namespaceId: 'ns',
      isGenerating: false,
    });
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Harness />));
  act(() => share.open(undefined, 'all'));
  expect(share!.selectedCount).toBe(2);
  const first = [...share!.selectedGroupIds][0];
  act(() => share.toggleGroup(first));
  expect(share!.selectedCount).toBe(1);
  expect(share!.allSelected).toBe(false);
  act(() => share.toggleAll());
  expect(share!.selectedCount).toBe(2);
  act(() => root.unmount());
});
