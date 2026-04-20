import { useEffect, useState } from 'react';

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

  useEffect(() => {
    return app.on('context_clear', () => {
      setSelectedResources([]);
      removeChatContext();
    });
  }, []);

  useEffect(() => {
    setChatContext(selectedResources);
    return app.on(
      'context',
      (resource: Resource, type: PrivateSearchResourceType) => {
        const target = selectedResources.find(
          item => item.resource.id === resource.id && item.type === type
        );
        if (target) {
          return;
        }
        setSelectedResources([...selectedResources, { type, resource }]);
      }
    );
  }, [selectedResources]);

  return {
    selectedResources,
    setSelectedResources,
  };
}
