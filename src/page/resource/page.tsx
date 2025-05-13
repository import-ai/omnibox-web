import { Resource } from '@/interface';
import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IUseResource } from 'src/hooks/user-resource';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';

interface IProps extends Omit<IUseResource, 'resource'> {
  resource: Resource;
}

export default function Page(props: IProps) {
  const { app, resource, resource_id, namespace_id } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(true);

  useEffect(() => {
    return app.on('resource_children', (visible: boolean) => {
      onOpen((val) => (val !== visible ? visible : val));
    });
  }, []);

  if (open) {
    return (
      <Render
        content={`# ${resource.name || t('untitled')}\n${resource.content || ''}`}
      />
    );
  }

  return (
    <Editor
      app={app}
      resource={resource}
      resource_id={resource_id}
      namespace_id={namespace_id}
    />
  );
}
