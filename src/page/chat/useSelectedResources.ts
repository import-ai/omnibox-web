import { useEffect } from 'react';

import useApp from '@/hooks/useApp';
import { Resource } from '@/interface';
import { useChatStore } from '@/page/chat/chatStore';

import { IResTypeContext, PrivateSearchResourceType } from './chat-input/types';

export default function useSelectedResources() {
  const app = useApp();
  const selectedResources = useChatStore(state => state.selectedResources);
  const addContext = useChatStore(state => state.addContext);
  const removeContext = useChatStore(state => state.removeContext);
  const clearContext = useChatStore(state => state.clearContext);

  useEffect(() => {
    return app.on('context_clear', () => {
      clearContext();
    });
  }, [app, clearContext]);

  useEffect(() => {
    return app.on(
      'context',
      (resource: Resource, type: PrivateSearchResourceType) => {
        addContext(resource, type);
      }
    );
  }, [app, addContext]);

  useEffect(() => {
    return app.on('delete_resource', (id: string) => {
      removeContext(id);
    });
  }, [app, removeContext]);

  const setSelectedResources = (resources: IResTypeContext[]) => {
    useChatStore.getState().setContext(resources);
  };

  return {
    selectedResources,
    setSelectedResources,
    addContext,
    removeContext,
    clearContext,
  };
}
