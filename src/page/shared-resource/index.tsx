import { t } from 'i18next';

import Loading from '@/components/loading';
import useWide from '@/hooks/use-wide';
import { cn } from '@/lib/utils';

import Render from '../resource/render';
import { useShareContext } from '../share';
import FolderChildren from './folder-children';

export default function SharedResourcePage() {
  const { shareInfo, resource } = useShareContext();
  const { wide } = useWide();

  if (shareInfo && resource) {
    return (
      <div className="flex justify-center h-full p-4">
        <div
          className={cn('flex flex-col w-full h-full', {
            'max-w-3xl': !wide,
          })}
        >
          <h1 className="text-4xl font-bold mb-4">
            {resource.name || t('untitled')}
          </h1>
          {resource.resource_type === 'folder' ? (
            <FolderChildren shareId={shareInfo.id} resourceId={resource.id} />
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
