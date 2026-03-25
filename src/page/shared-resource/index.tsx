import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { cn, setDocumentTitle } from '@/lib/utils';

import Folder from '../resource/folder';
import Render from '../resource/render';
import { useShareContext } from '../share';

export default function SharedResourcePage() {
  const { t } = useTranslation();
  const { shareInfo, resource, wide } = useShareContext();

  useEffect(() => {
    if (resource?.name) {
      setDocumentTitle(resource.name);
    }
  }, [resource?.name]);

  if (shareInfo && resource) {
    return (
      <div className="flex h-full w-full min-w-0 justify-center overflow-auto p-4">
        <div
          className={cn('flex min-w-0 w-full max-w-full flex-col', {
            'max-w-3xl': !wide,
            'max-w-7xl': wide,
          })}
        >
          <h1 className="mb-4 min-w-0 max-w-full text-4xl font-bold break-all">
            {resource.name || t('untitled')}
          </h1>
          {resource.resource_type === 'folder' ? (
            <Folder
              resourceId={resource.id}
              apiPrefix={`/shares/${shareInfo.id}/resources`}
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
