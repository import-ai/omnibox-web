/** @jest-environment jsdom */

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

describe('copilot store', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
  });

  it('keeps panel state isolated by namespace', () => {
    const store = useCopilotStore.getState();

    store.open('namespace-a');
    store.showConversation('namespace-a', 'conversation-1');
    store.showHistory('namespace-b');

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: true,
        view: 'conversation',
        conversationId: 'conversation-1',
      })
    );
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-b')
    ).toEqual(
      expect.objectContaining({
        open: true,
        view: 'history',
        conversationId: null,
      })
    );
  });

  it('opens an internal citation without losing the active conversation', () => {
    const store = useCopilotStore.getState();

    store.showConversation('namespace-a', 'conversation-1');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: true,
        view: 'conversation',
        conversationId: 'conversation-1',
        previewResourceId: 'Abcd1234Efgh5678',
      })
    );
  });

  it('starts a new chat while keeping the resource preview visible', () => {
    const store = useCopilotStore.getState();

    store.showConversation('namespace-a', 'conversation-1');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');
    store.showHome('namespace-a');

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: true,
        view: 'home',
        conversationId: null,
        previewResourceId: 'Abcd1234Efgh5678',
      })
    );
  });

  it('closes the panel and active resource preview together', () => {
    const store = useCopilotStore.getState();

    store.previewResource('namespace-a', 'Abcd1234Efgh5678');
    store.close('namespace-a');

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: false,
        previewResourceId: null,
      })
    );
  });

  it('persists workspace state for the current tab only', () => {
    useCopilotStore
      .getState()
      .showConversation('namespace-a', 'conversation-1');

    expect(sessionStorage.getItem('copilot-workspaces')).not.toBeNull();
    expect(localStorage.getItem('copilot-workspaces')).toBeNull();
  });

  it('clears every workspace when the authenticated user changes', () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-1');
    store.showHistory('namespace-b');

    store.clearAll();

    expect(useCopilotStore.getState().workspaces).toEqual({});
  });
});
