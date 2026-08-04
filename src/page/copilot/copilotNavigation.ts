import { CopilotWorkspaceState } from './copilotStore';

/** Returns the full-page chat route that represents the visible Copilot view. */
export function getExpandedCopilotPath(
  namespaceId: string,
  workspace: CopilotWorkspaceState
) {
  const chatRoot = `/${namespaceId}/chat`;

  if (!workspace.open || workspace.view === 'home') {
    return chatRoot;
  }
  if (workspace.view === 'history') {
    return `${chatRoot}/conversations`;
  }
  if (workspace.conversationId) {
    return `${chatRoot}/${workspace.conversationId}`;
  }
  return chatRoot;
}
