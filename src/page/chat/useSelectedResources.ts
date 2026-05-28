import { useEffect, useState } from 'react';

import useApp from '@/hooks/useApp';
import { Resource } from '@/interface';
import {
  getChatContext,
  removeChatContext,
  setChatContext,
} from '@/lib/chatContext';
import { useChatStore } from '@/page/chat/chatStore';

import { IResTypeContext, PrivateSearchResourceType } from './chat-input/types';

export default function useSelectedResources() {
  const app = useApp();
  const selectedResources = useChatStore(state => state.selectedResources);
  const addContext = useChatStore(state => state.addContext);
  const removeContext = useChatStore(state => state.removeContext);
  const clearContext = useChatStore(state => state.clearContext);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const cached = getChatContext();
    if (cached.length > 0) {
      const store = useChatStore.getState();
      cached.forEach(item => {
        if (
          !store.selectedResources.find(
            resource => resource.resource.id === item.resource.id
          )
        ) {
          store.addContext(item.resource, item.type);
        }
      });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (selectedResources.length > 0) {
      setChatContext(selectedResources);
    } else {
      removeChatContext();
    }
  }, [selectedResources, hydrated]);

  useEffect(() => {
    return app.on('context_clear', () => {
      clearContext();
      removeChatContext();
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
