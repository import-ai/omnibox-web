import type { IResTypeContext } from '@/page/chat/chat-input/types';
import { useChatStore } from '@/page/chat/chat-store';

export default function useSelectedResources() {
  const selectedResources = useChatStore(state => state.selectedResources);
  const addContext = useChatStore(state => state.addContext);
  const removeContext = useChatStore(state => state.removeContext);
  const clearContext = useChatStore(state => state.clearContext);
  const setSelectedResources = useChatStore(state => state.setContext);

  const setContext = (resources: IResTypeContext[]) => {
    setSelectedResources(resources);
  };

  return {
    selectedResources,
    setSelectedResources: setContext,
    addContext,
    removeContext,
    clearContext,
  };
}
