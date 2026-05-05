import { useEffect, useRef, useState } from 'react';

import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import {
  getChatContext,
  removeChatContext,
  setChatContext,
} from '@/lib/chat-context';
import type {
  IResTypeContext,
  PrivateSearchResourceType,
} from '@/page/chat/chat-input/types';

export default function useSelectedResources() {
  const app = useApp();
  const [selectedResources, setSelectedResources] =
    useState<IResTypeContext[]>(getChatContext());
  const selectedResourcesRef = useRef(selectedResources);
  selectedResourcesRef.current = selectedResources;

  useEffect(() => {
    setChatContext(selectedResources);
  }, [selectedResources]);

  useEffect(() => {
    return app.on('context_clear', () => {
      setSelectedResources([]);
      removeChatContext();
    });
  }, [app]);

  useEffect(() => {
    return app.on(
      'context',
      (resource: Resource, type: PrivateSearchResourceType) => {
        const current = selectedResourcesRef.current;
        const target = current.find(
          item => item.resource.id === resource.id && item.type === type
        );
        if (target) {
          return;
        }
        setSelectedResources([...current, { type, resource }]);
      }
    );
  }, [app]);

  useEffect(() => {
    return app.on('delete_resource', (id: string) => {
      setSelectedResources(prev => {
        const filtered = prev.filter(item => item.resource.id !== id);
        return filtered.length !== prev.length ? filtered : prev;
      });
    });
  }, [app]);

  return {
    selectedResources,
    setSelectedResources,
  };
}
