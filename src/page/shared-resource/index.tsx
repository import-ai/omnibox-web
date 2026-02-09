import { useEffect } from 'react';

import Loading from '@/components/loading';
import { cn, setDocumentTitle } from '@/lib/utils';

import Folder from '../resource/folder';
import Render from '../resource/render';
import { useShareContext } from '../share';

export default function SharedResourcePage() {
  const { shareInfo, resource, wide } = useShareContext();

  useEffect(() => {
    if (resource?.name) {
      setDocumentTitle(resource.name);
    }
  }, [resource?.name]);

  useEffect(() => {
    if (resource?.name) {
      setDocumentTitle(resource.name);
    }
  }, [resource?.name]);

  if (shareInfo && resource) {
    return (
      <div className="flex justify-center h-full w-full p-4 overflow-auto">
        <div
          className={cn('flex flex-col w-full', {
            'max-w-3xl': !wide,
          })}
        >
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
