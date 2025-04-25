import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useState, useEffect } from 'react';
import useResource from '@/hooks/user-resource';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';

export default function ResourcePage() {
  const [open, onOpen] = useState(true);
  const { app, resource } = useResource();

  useEffect(() => {
    return app.on('resource_children', onOpen);
  }, []);

  if (!resource) {
    return null;
  }

  if (open) {
    return (
      <Render
        content={`# ${resource.name || 'Untitled'}\n${resource.content || ''}`}
      />
    );
  }

  return <Editor app={app} resource={resource} />;
}
