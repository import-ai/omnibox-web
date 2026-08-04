import { getExpandedCopilotPath } from './copilotNavigation';
import { CopilotWorkspaceState } from './copilotStore';

const workspace = (
  overrides: Partial<CopilotWorkspaceState> = {}
): CopilotWorkspaceState => ({
  open: true,
  view: 'home',
  conversationId: null,
  previewResourceId: null,
  ...overrides,
});

describe('getExpandedCopilotPath', () => {
  it('opens the chat home when Copilot is not currently visible', () => {
    expect(
      getExpandedCopilotPath(
        'namespace-a',
        workspace({
          open: false,
          view: 'conversation',
          conversationId: 'conversation-a',
        })
      )
    ).toBe('/namespace-a/chat');
  });

  it('expands the Copilot home into the chat home', () => {
    expect(getExpandedCopilotPath('namespace-a', workspace())).toBe(
      '/namespace-a/chat'
    );
  });

  it('expands Copilot history into the full history page', () => {
    expect(
      getExpandedCopilotPath('namespace-a', workspace({ view: 'history' }))
    ).toBe('/namespace-a/chat/conversations');
  });

  it('expands the active conversation into its full conversation page', () => {
    expect(
      getExpandedCopilotPath(
        'namespace-a',
        workspace({
          view: 'conversation',
          conversationId: 'conversation-a',
        })
      )
    ).toBe('/namespace-a/chat/conversation-a');
  });

  it('falls back to the chat home when the conversation id is missing', () => {
    expect(
      getExpandedCopilotPath('namespace-a', workspace({ view: 'conversation' }))
    ).toBe('/namespace-a/chat');
  });
});
