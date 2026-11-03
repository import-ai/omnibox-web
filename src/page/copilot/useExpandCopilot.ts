import { useNavigate } from 'react-router-dom';

import { isChatSubmissionPreparing } from '@/page/chat/chat-input/chatSubmissionStore';

import { getExpandedCopilotPath } from './copilotNavigation';
import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

export function useExpandCopilot(namespaceId: string) {
  const navigate = useNavigate();

  return () => {
    if (isChatSubmissionPreparing(namespaceId)) return;
    const store = useCopilotStore.getState();
    const workspace = getCopilotWorkspace(store, namespaceId);
    const destination = getExpandedCopilotPath(namespaceId, workspace);
    // Keep the preview covering the resource until the chat route commits.
    store.requestExpandFromResource(namespaceId);
    navigate(destination);
  };
}
