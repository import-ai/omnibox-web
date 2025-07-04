import each from '@/lib/each';
import { http } from '@/lib/request';
import FormResource from './resource';
import { useState, useEffect } from 'react';
import type { Resource } from '@/interface';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Search, LoaderCircle } from 'lucide-react';
import { LazyInput } from '@/components/input/lazy';

export interface IFormProps {
  resourceId: string;
  namespaceId: string;
  onFinished?: (resouceId: string, targetId: string) => void;
}

export default function MoveToForm(props: IFormProps) {
  const { resourceId, namespaceId, onFinished } = props;
  const { t } = useTranslation();
  const [editId, onEditId] = useState('');
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<{
    root: Array<Resource>;
    resources: Array<Resource>;
  }>({
    root: [],
    resources: [],
  });

  useEffect(() => {
    onLoading(true);
    if (!search) {
      http
        .get(`/namespaces/${namespaceId}/root?namespace_id=${namespaceId}`)
        .then((response) => {
          const root: Array<Resource> = [];
          const resources: Array<Resource> = [];
          Object.keys(response).forEach((spaceType) => {
            const item = response[spaceType];
            if (!item.id) {
              return;
            }
            root.push({ ...item, spaceType });
            if (Array.isArray(item.children) && item.children.length > 0) {
              const resourceChildrenIdToRemove: Array<string> = [];
              each(item.children, (children) => {
                if (
                  children.parent_id === resourceId ||
                  resourceChildrenIdToRemove.includes(children.parent_id)
                ) {
                  resourceChildrenIdToRemove.push(children.id);
                }
              });
              if (resourceChildrenIdToRemove.length > 0) {
                item.children = item.children.filter(
                  (children: Resource) =>
                    !resourceChildrenIdToRemove.includes(children.id) &&
                    children.id !== resourceId,
                );
              } else {
                item.children = item.children.filter(
                  (children: Resource) => children.id !== resourceId,
                );
              }
              resources.push(...item.children);
            }
          });
          onData({ root, resources });
        })
        .finally(() => {
          onLoading(false);
        });
      return;
    }
    http
      .get(
        `/namespaces/${namespaceId}/resources/search?resourceId=${resourceId}&name=${encodeURIComponent(search)}`,
      )
      .then((response) => {
        onData({
          root: [],
          resources: response,
        });
      })
      .finally(() => {
        onLoading(false);
      });
  }, [search]);

  return (
    <div>
      <div className="relative mb-2">
        {loading ? (
          <LoaderCircle className="absolute left-3 top-[10px] size-4 opacity-50 transition-transform animate-spin" />
        ) : (
          <Search className="absolute left-3 top-[10px] size-4 opacity-50" />
        )}
        <LazyInput
          value={search}
          onChange={onSearch}
          className="pl-10 rounded-lg"
          placeholder={t('actions.move_page_to')}
        />
      </div>
      <div className="pb-2 min-h-60 max-h-80 overflow-y-auto">
        {data.root.length > 0 && (
          <>
            <Button
              disabled
              variant="ghost"
              className="w-full whitespace-normal justify-start items-start rounded-none pb-0 h-7"
            >
              Root
            </Button>
            {data.root.map((item) => (
              <FormResource
                data={item}
                key={item.id}
                editId={editId}
                onEditId={onEditId}
                onSearch={onSearch}
                onFinished={onFinished}
                resourceId={resourceId}
                namespaceId={namespaceId}
              />
            ))}
          </>
        )}
        {data.resources.length > 0 && (
          <>
            <Button
              disabled
              variant="ghost"
              className="w-full whitespace-normal justify-start items-start rounded-none pb-0 h-7"
            >
              Resource
            </Button>
            {data.resources.map((item) => (
              <FormResource
                data={item}
                key={item.id}
                editId={editId}
                onEditId={onEditId}
                onSearch={onSearch}
                onFinished={onFinished}
                resourceId={resourceId}
                namespaceId={namespaceId}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
