import useApp from '@/hooks/use-app';
import Chat from '@/page/resource/chat';
import { useState, useEffect } from 'react';
import Resource from '@/page/resource/resource';

export default function ResourcePage() {
  const app = useApp();
  const [open, onOpen] = useState(true);

  useEffect(() => {
    return app.on('resource_wrapper', onOpen);
  }, []);

  if (open) {
    return <Chat />;
  }

  return <Resource />;
}
