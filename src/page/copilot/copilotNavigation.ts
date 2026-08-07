import { CopilotWorkspaceState } from './copilotStore';

/** Returns the full-page chat route that represents the visible Copilot view. */
export function getExpandedCopilotPath(
  namespaceId: string,
  workspace: CopilotWorkspaceState
) {
  const chatRoot = `/${namespaceId}/chat`;

  // Prefer the active view even when the panel is collapsed (open=false) so
  // "close current resource" still promotes the conversation under a citation.
  if (workspace.view === 'history') {
    return `${chatRoot}/conversations`;
  }
  if (workspace.view === 'conversation' && workspace.conversationId) {
    return `${chatRoot}/${workspace.conversationId}`;
  }
  return chatRoot;
}
