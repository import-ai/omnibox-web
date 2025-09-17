import { useEffect, useState } from 'react';

import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import type { PrivateSearchResourceType } from '@/page/chat/chat-input/types';
import type { PrivateSearchResource } from '@/page/chat/conversation/types';

interface IProps {
  data: PrivateSearchResource[];
}

export default function useContext(props: IProps) {
  const app = useApp();
  const [context, onContextChange] = useState<PrivateSearchResource[]>(
    props.data
  );

  useEffect(() => {
    return app.on('context_clear', () => {
      onContextChange([]);
    });
  }, []);

  useEffect(() => {
    return app.on(
      'context',
      (resource: Resource, type: PrivateSearchResourceType) => {
        const target = context.find(
          item => item.id === resource.id && item.type === type
        );
        if (target) {
          return;
        }
        onContextChange([
          ...context,
          {
            id: resource.id,
            name: resource.name || '',
            type,
          },
        ]);
      }
    );
  }, [context]);

  return { context, onContextChange };
}
