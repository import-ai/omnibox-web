import { Resource } from '@/interface';
import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import App from '@/hooks/app.class';

interface IProps {
  app: App;
  resource: Resource;
}

export default function Page(props: IProps) {
  const { app, resource } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(true);

  useEffect(() => {
    return app.on('resource_children', (visible: boolean) => {
      onOpen((val) => (val !== visible ? visible : val));
    });
  }, []);

  if (open || resource.resource_type === 'folder') {
    return (
      <Render
        content={`# ${resource.name || t('untitled')}\n${resource.content || ''}`}
      />
    );
  }

  return <Editor resource={resource} />;
}
