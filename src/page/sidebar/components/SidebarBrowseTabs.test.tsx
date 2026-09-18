/** @jest-environment jsdom */
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { SidebarBrowseTabs } from './SidebarBrowseTabs';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/loading', () => ({
  __esModule: true,
  default: () => <span>Loading</span>,
}));
jest.mock('@/page/chat/conversations', () => ({
  __esModule: true,
  default: ({
    namespaceId,
    onConversationSelect,
  }: {
    namespaceId: string;
    onConversationSelect: (id: string) => void;
  }) => (
    <button onClick={() => onConversationSelect('conversation-1')}>
      {namespaceId}
    </button>
  ),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function ResourceProbe() {
  const [expanded, setExpanded] = useState(false);
  const handleExpand = () => setExpanded(true);
  return (
    <button onClick={handleExpand}>
      {expanded ? 'Expanded' : 'Collapsed'}
    </button>
  );
}

it('switches sidebar panels without resetting resources and forwards conversation selection', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSelect = jest.fn();
  try {
    await act(async () =>
      root.render(
        <SidebarBrowseTabs namespaceId="space" onConversationSelect={onSelect}>
          <ResourceProbe />
        </SidebarBrowseTabs>
      )
    );
    const resourceTab = container.querySelector(
      '[role="tab"][data-state="active"]'
    );
    const chatTab = container.querySelector(
      '[role="tab"][data-state="inactive"]'
    );
    const resourceButton = container.querySelector('[role="tabpanel"] button');
    if (
      !(resourceButton instanceof HTMLButtonElement) ||
      !chatTab ||
      !resourceTab
    ) {
      throw new Error('Sidebar controls are missing');
    }
    await act(async () => resourceButton.click());
    await act(async () =>
      chatTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    expect(chatTab.getAttribute('aria-selected')).toBe('true');
    expect(resourceButton.textContent).toBe('Expanded');
    expect(
      resourceButton.closest('[role="tabpanel"]')?.getAttribute('data-state')
    ).toBe('inactive');
    const conversationButton = container.querySelector(
      '[role="tabpanel"][data-state="active"] button'
    );
    if (!(conversationButton instanceof HTMLButtonElement)) {
      throw new Error('Conversation control is missing');
    }
    await act(async () => conversationButton.click());
    expect(onSelect).toHaveBeenCalledWith('conversation-1');
    await act(async () =>
      resourceTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    expect(resourceTab.getAttribute('aria-selected')).toBe('true');
    expect(resourceButton.textContent).toBe('Expanded');
    await act(async () =>
      chatTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    expect(
      container.querySelector('[role="tabpanel"][data-state="active"] button')
    ).toBe(conversationButton);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
