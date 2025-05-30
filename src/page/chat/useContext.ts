import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { useEffect, useState } from 'react';

export interface IResTypeContext {
  type: string;
  resource: Resource;
}

interface IProps {
  data: IResTypeContext[];
}

export default function useContext(props: IProps) {
  const app = useApp();
  const [context, onContextChange] = useState<IResTypeContext[]>(props.data);

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
