import axios from 'axios';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Loading from '@/components/loading';
import { Separator } from '@/components/ui/separator';
import { Resource, ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import ResourceIcon from '@/page/sidebar/content/resourceIcon';

import { groupItemsByTimestamp } from '../utils';
import { FolderContent } from './content';

interface IProps {
  resourceId: string;
  apiPrefix: string;
  navigationPrefix: string;
}

export default function Folder(props: IProps) {
  const { resourceId, apiPrefix, navigationPrefix } = props;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<ResourceMeta>>([]);

  useEffect(() => {
    onLoading(true);
    const source = axios.CancelToken.source();
    http
      .get(`${apiPrefix}/${resourceId}/children`, {
        cancelToken: source.token,
      })
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
    return () => {
      source.cancel();
    };
  }, [apiPrefix, resourceId]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {data.length > 0 ? (
        <>
          {groupItemsByTimestamp(data, i18n).map(([key, items]) => (
            <div key={key}>
              <div className="pb-4">
                <p className="text-sm text-muted-foreground font-light ml-0.5">
                  {key}
                </p>
              </div>
              {items.map((item, index) => {
                const iconResource = {
                  id: item.id,
                  name: item.name,
                  resource_type: item.resource_type,
                  parent_id: '',
                  space_type: 'private',
                  has_children: !!item.has_children,
                  attrs: (item as any).attrs || {},
                } as unknown as Resource;
                return (
                  <div
                    className="cursor-pointer group"
                    key={item.id}
                    onClick={() => {
                      navigate(`${navigationPrefix}/${item.id}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="[&>svg]:w-5 [&>svg]:h-5 text-muted-foreground">
                          <ResourceIcon
                            expand={false}
                            resource={iconResource}
                          />
                        </div>
                        <h3 className="text-lg font-medium line-clamp-2 group-hover:text-blue-500 truncate">
                          {item.name || t('untitled')}
                        </h3>
                      </div>
                    </div>
                    {item.resource_type === 'folder' ? (
                      <FolderContent resource={item} apiPrefix={apiPrefix} />
                    ) : (
                      <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                        {item.updated_at
                          ? format(item.updated_at, 'yyyy-MM-dd HH:mm:ss')
                          : ''}
                      </p>
                    )}
                    {index < items.length - 1 && <Separator className="my-4" />}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      ) : (
        <div className="mt-12 text-center text-gray-500">
          {t('no_pages_inside')}
        </div>
      )}
    </div>
  );
}
