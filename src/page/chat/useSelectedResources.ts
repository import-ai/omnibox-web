import { useEffect, useState } from 'react';

import {
  getChatContext,
  removeChatContext,
  setChatContext,
} from '@/lib/chat-context';
import { useChatStore } from '@/page/chat/chat-store';

export default function useSelectedResources() {
  const selectedResources = useChatStore(state => state.selectedResources);
  const addContext = useChatStore(state => state.addContext);
  const removeContext = useChatStore(state => state.removeContext);
  const clearContext = useChatStore(state => state.clearContext);

  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const cached = getChatContext();
    if (cached.length > 0) {
      const store = useChatStore.getState();
      cached.forEach(item => {
        if (
          !store.selectedResources.find(r => r.resource.id === item.resource.id)
        ) {
          store.addContext(item.resource, item.type);
        }
      });
    }
    setHydrated(true);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (hydrated) {
      if (selectedResources.length > 0) {
        setChatContext(selectedResources);
      } else {
        removeChatContext();
      }
    }
  }, [selectedResources, hydrated]);

  const setSelectedResources = (resources: any[]) => {
    useChatStore.getState().setContext(resources);
  };

  useEffect(() => {
    return app.on('delete_resource', (id: string) => {
      const filtered = selectedResources.filter(
        item => item.resource.id !== id
      );
      if (filtered.length !== selectedResources.length) {
        setSelectedResources(filtered);
      }
    });
  }, [selectedResources]);

  return {
    selectedResources,
    setSelectedResources,
    addContext,
    removeContext,
    clearContext,
  };
}
