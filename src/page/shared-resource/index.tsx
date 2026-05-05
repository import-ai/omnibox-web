import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Attributes from '@/components/attributes';
import Loading from '@/components/loading';
import { useSidebar } from '@/components/ui/sidebar';
import { cn, setDocumentTitle } from '@/lib/utils';

import Folder from '../resource/folder';
import Render from '../resource/render';
import { useShareContext } from '../share';

export default function SharedResourcePage() {
  const { t } = useTranslation();
  const { shareInfo, resource, wide } = useShareContext();
  const { open } = useSidebar();
  const [large, onLarge] = useState(window.innerWidth > 1500);

  useEffect(() => {
    if (resource?.name) {
      setDocumentTitle(resource.name);
    }
  }, [resource?.name]);

  useEffect(() => {
    function handleSize() {
      onLarge(window.innerWidth > 1500);
    }
    window.addEventListener('resize', handleSize);
    return () => {
      window.removeEventListener('resize', handleSize);
    };
  }, []);

  if (shareInfo && resource) {
    return (
      <div className="flex h-full w-full min-w-0 justify-center overflow-y-auto overflow-x-hidden p-4">
        <div
          className={cn('flex min-w-0 w-full max-w-full flex-col', {
            'max-w-[680px]': !wide && (open || !large),
            'max-w-[800px]': !wide && (!open || large),
            'max-w-7xl': wide,
          })}
        >
          <h1 className="mb-4 min-w-0 max-w-full text-4xl font-bold break-all">
            {resource.name || t('untitled')}
          </h1>
          <Attributes
            resource={resource as any}
            namespaceId={shareInfo.id}
            readOnly
          />
          {resource.resource_type === 'smart_folder' ? (
            <Folder
              resourceId={resource.id}
              apiPrefix={`/shares/${shareInfo.id}/resources`}
              namespaceId={shareInfo.id}
              emptyText={t('smart_folder.empty')}
              navigationPrefix={`/s/${shareInfo.id}`}
              loadAll
              smartFolderParentId={resource.id}
            />
          ) : resource.resource_type === 'folder' ? (
            <Folder
              resourceId={resource.id}
              apiPrefix={`/shares/${shareInfo.id}/resources`}
              namespaceId={shareInfo.id}
              navigationPrefix={`/s/${shareInfo.id}`}
            />
          ) : (
            <Render
              resource={resource}
              linkBase={`/s/${shareInfo.id}/${resource.id}`}
            />
          )}
        </div>
      </div>
    );
  }
  return <Loading />;
}
