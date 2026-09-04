/** @jest-environment jsdom */

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

describe('copilot store', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useCopilotStore.setState({
      workspaces: {},
      pendingExpandFromResource: {},
    });
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
    store.previewResource('namespace-a', 'Abcd1234Efgh5678', 12);

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: true,
        view: 'conversation',
        conversationId: 'conversation-1',
        previewResourceId: 'Abcd1234Efgh5678',
        previewLineNumber: 12,
      })
    );
  });

  it('opens a resource beside its conversation in one state update', () => {
    const store = useCopilotStore.getState();
    let updateCount = 0;
    const unsubscribe = useCopilotStore.subscribe(() => {
      updateCount += 1;
    });

    store.showResourceBesideConversation(
      'namespace-a',
      'conversation-1',
      'Abcd1234Efgh5678'
    );
    unsubscribe();

    expect(updateCount).toBe(1);
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual({
      open: true,
      view: 'conversation',
      conversationId: 'conversation-1',
      previewResourceId: 'Abcd1234Efgh5678',
      previewLineNumber: null,
    });
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

  it('keeps the citation preview when the panel is collapsed', () => {
    const store = useCopilotStore.getState();

    store.previewResource('namespace-a', 'Abcd1234Efgh5678');
    store.close('namespace-a');

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: false,
        previewResourceId: 'Abcd1234Efgh5678',
      })
    );
  });

  it('toggles the panel without clearing an active citation preview', () => {
    const store = useCopilotStore.getState();

    store.previewResource('namespace-a', 'Abcd1234Efgh5678');
    store.toggle('namespace-a');

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: false,
        previewResourceId: 'Abcd1234Efgh5678',
      })
    );

    store.toggle('namespace-a');

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toEqual(
      expect.objectContaining({
        open: true,
        previewResourceId: 'Abcd1234Efgh5678',
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
    store.requestExpandFromResource('namespace-a');

    store.clearAll();

    expect(useCopilotStore.getState().workspaces).toEqual({});
    expect(useCopilotStore.getState().pendingExpandFromResource).toEqual({});
  });

  it('tracks a pending expand-from-resource without clearing the preview', () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-1');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');
    store.requestExpandFromResource('namespace-a');

    expect(useCopilotStore.getState().pendingExpandFromResource).toEqual({
      'namespace-a': true,
    });
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
        .previewResourceId
    ).toBe('Abcd1234Efgh5678');

    store.clearPendingExpandFromResource('namespace-a');
    expect(useCopilotStore.getState().pendingExpandFromResource).toEqual({});
  });
});
