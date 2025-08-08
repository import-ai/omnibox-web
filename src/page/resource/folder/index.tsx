import axios from 'axios';
import { format } from 'date-fns';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { FolderContent } from './content';
import { useEffect, useState } from 'react';
import Loading from '@/components/loading';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { groupItemsByTimestamp } from '../utils';
import { Separator } from '@/components/ui/separator';

interface IProps {
  resource: Resource;
  namespaceId: string;
}

export default function Folder(props: IProps) {
  const { resource, namespaceId } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Resource>>([]);

  useEffect(() => {
    onLoading(true);
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/resources/${resource.id}/children`, {
        cancelToken: source.token,
      })
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
    return () => {
      source.cancel();
    };
  }, [namespaceId, resource.id]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {data.length > 0 ? (
        <>
          {groupItemsByTimestamp(data).map(([key, items]) => (
            <div key={key}>
              <div className="pb-4">
                <p className="text-sm text-muted-foreground font-light ml-0.5">
                  {key}
                </p>
              </div>
              {items.map((item, index) => {
                return (
                  <div
                    className="cursor-pointer group"
                    key={item.id}
                    onClick={() => {
                      navigate(`/${namespaceId}/${item.id}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium line-clamp-2  group-hover:text-blue-500">
                        {item.name || t('untitled')}
                      </h3>
                    </div>
                    {item.resource_type === 'folder' ? (
                      <FolderContent
                        resource={item}
                        namespaceId={namespaceId}
                      />
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
