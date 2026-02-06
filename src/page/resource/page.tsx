import { Download } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Attributes from '@/components/attributes';
import { Button } from '@/components/ui/button';
import { Resource } from '@/interface';
import Editor from '@/page/resource/editor';
import Folder from '@/page/resource/folder';
import { ExportAllDialog } from '@/page/resource/folder/export-all-dialog';
import Render from '@/page/resource/render';

interface IProps {
  editPage: boolean;
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

export default function Page(props: IProps) {
  const { editPage, resource, onResource, namespaceId } = props;
  const { t } = useTranslation();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  if (editPage) {
    return (
      <Editor
        resource={resource}
        onResource={onResource}
        namespaceId={namespaceId}
      />
    );
  }

  return (
    <>
      <h1 className="text-4xl font-bold mb-4 break-words">
        {resource.name || t('untitled')}
      </h1>
      <Attributes
        namespaceId={namespaceId}
        resource={resource}
        onResource={onResource}
      />
      {resource.resource_type === 'folder' ? (
        <>
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="size-4 mr-2" />
              {t('export.export_all')}
            </Button>
          </div>
          <Folder
            resourceId={resource.id}
            apiPrefix={`/namespaces/${namespaceId}/resources`}
            navigationPrefix={`/${namespaceId}`}
          />
          <ExportAllDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            namespaceId={namespaceId}
            resourceId={resource.id}
            folderName={resource.name || 'export'}
          />
        </>
      ) : (
        <Render
          resource={resource}
          linkBase={resource.id}
          style={{ overflow: 'inherit' }}
        />
      )}
    </>
  );
}
