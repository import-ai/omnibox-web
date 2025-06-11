import { Resource } from '@/interface';
import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import App from '@/hooks/app.class';
import { http } from '@/lib/request.ts';

interface IProps {
  app: App;
  resource: Resource;
}

export default function Page(props: IProps) {
  const { app, resource } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(true);
  const title: string = `#  ${resource.name || t('untitled')}`;
  const [folderContent, setFolderContent] = useState<string>(title);

  useEffect(() => {
    return app.on('resource_children', (visible: boolean) => {
      onOpen((val) => (val !== visible ? visible : val));
    });
  }, []);

  useEffect(() => {
    if (resource.resource_type === 'folder') {
      http
        .get(`/namespaces/${resource.namespace.id}/resources/query`, {
          params: {
            namespace: resource.namespace.id,
            spaceType: resource.space_type,
            parentId: resource.id,
          },
        })
        .then((response: Resource[]) => {
          let markdown: string = title;
          if (response.length > 0) {
            for (const r of response) {
              markdown += `\n- [${r.name || t('untitled')}](./${r.id})`;
            }
          }
          setFolderContent(markdown);
        });
    }
    return () => setFolderContent('');
  }, [resource]);

  if (open) {
    if (resource.resource_type === 'folder') {
      return <Render content={folderContent} />;
    }
    return (
      <Render
        content={`# ${resource.name || t('untitled')}\n${resource.content || ''}`}
      />
    );
  }

  return <Editor resource={resource} />;
}
