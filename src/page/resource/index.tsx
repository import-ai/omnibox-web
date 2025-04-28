import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { IUseResource } from 'src/hooks/user-resource';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';

export default function ResourcePage(props: IUseResource) {
  const { app, resource, resourceId } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(true);

  useEffect(() => {
    return app.on('resource_children', onOpen);
  }, []);

  if (!resource) {
    return null;
  }

  if (open) {
    return (
      <Render
        content={`# ${resource.name || t('untitled')}\n${resource.content || ''}`}
      />
    );
  }

  return <Editor app={app} resource={resource} resourceId={resourceId} />;
}
