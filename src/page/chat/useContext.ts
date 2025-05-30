import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { useState, useEffect } from 'react';

interface IProps {
  data: Array<{ type: string; resource: Resource }>;
}

export default function useContext(props: IProps) {
  const app = useApp();
  const [context, onContextChange] = useState<
    Array<{ type: string; resource: Resource }>
  >(props.data);

  useEffect(() => {
    return app.on('context_clear', () => {
      onContextChange([]);
    });
  }, []);

  useEffect(() => {
    return app.on(
      'context',
      (resource: Resource, type: 'resource' | 'parent') => {
        const target = context.find(
          (item) => item.resource.id === resource.id && item.type === type,
        );
        if (target) {
          return;
        }
        onContextChange([...context, { type, resource }]);
      },
    );
  }, [context]);

  return { context, onContextChange };
}
