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

export default function useContext() {
  const app = useApp();
  const [context, onContextChange] = useState<IResTypeContext[]>([]);

  useEffect(() => {
    onContextChange(getChatContext());
    return app.on('context_clear', () => {
      onContextChange([]);
      removeChatContext();
    });
  }, []);

  useEffect(() => {
    setChatContext(context);
    return app.on(
      'context',
      (resource: Resource, type: PrivateSearchResourceType) => {
        const target = context.find(
          item => item.resource.id === resource.id && item.type === type
        );
        if (target) {
          return;
        }
        onContextChange([...context, { type, resource }]);
      }
    );
  }, [context]);

  return { context, onContextChange };
}
