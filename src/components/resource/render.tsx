import { useResource } from '@/components/provider/resource-provider';
import { Markdown } from '@/components/markdown';
import React from 'react';

export default function Render() {
  const { resource } = useResource();

  const content = React.useMemo(() => {
    return (
      '# ' + (resource?.name || 'Untitled') + '\n' + (resource?.content || '')
    );
  }, [resource]);

  return <Markdown content={content} />;
}
