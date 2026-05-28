import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LazyInput } from '@/components/input/LazyInput';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { Resource, ResourceMeta } from '@/interface';
import type { ResourceType } from '@/interface';
import each from '@/lib/each';
import { fetchRootResources, searchResources } from '@/service/resource';

import FormResource from './Resource';

export interface IFormProps {
  resourceIds: string[];
  namespaceId: string;
  showDisabledTargets?: boolean;
  disabledTargetIds?: string[];
  disabledTargetTooltip?: string;
  sourceResourceType?: ResourceType;
  onFinished?: (
    resourceIds: string[],
    targetId: string,
    targetName?: string
  ) => void;
}

export default function MoveToForm(props: IFormProps) {
  const {
    resourceIds,
    namespaceId,
    showDisabledTargets,
    disabledTargetIds,
    disabledTargetTooltip,
    sourceResourceType,
    onFinished,
  } = props;
  const { t } = useTranslation();
  const [editId, onEditId] = useState('');
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<{
    root: Array<Resource>;
    resources: Array<Resource | ResourceMeta>;
  }>({
    root: [],
    resources: [],
  });

  useEffect(() => {
    onLoading(true);
    if (!search) {
      fetchRootResources(namespaceId)
        .then(response => {
          const root: Array<Resource> = [];
          const resources: Array<Resource> = [];
          Object.keys(response).forEach(spaceType => {
            const item = response[spaceType];
            if (!item.id) {
              return;
            }
            root.push({ ...item, spaceType });
            if (Array.isArray(item.children) && item.children.length > 0) {
              if (!showDisabledTargets) {
                const resourceChildrenIdToRemove = new Set(resourceIds);
                each(item.children, children => {
                  if (resourceChildrenIdToRemove.has(children.parent_id)) {
                    resourceChildrenIdToRemove.add(children.id);
                  }
                });
                item.children = item.children.filter(
                  (children: Resource) =>
                    !resourceChildrenIdToRemove.has(children.id)
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

    searchResources(namespaceId, search)
      .then(response => {
        if (showDisabledTargets) {
          onData({
            root: [],
            resources: response,
          });
          return;
        }

        const resourceIdSet = new Set(resourceIds);
        onData({
          root: [],
          resources: response.filter(
            (resource: Resource) => !resourceIdSet.has(resource.id)
          ),
        });
      })
      .finally(() => {
        onLoading(false);
      });
  }, [search, resourceIds, namespaceId, showDisabledTargets]);

  const disabledResourceIds = useMemo(() => {
    const ids = new Set(
      showDisabledTargets ? (disabledTargetIds ?? resourceIds) : resourceIds
    );
    if (!showDisabledTargets) {
      return ids;
    }
    each(data.resources, resource => {
      if (ids.has(resource.parent_id)) {
        ids.add(resource.id);
      }
    });
    return ids;
  }, [data.resources, disabledTargetIds, resourceIds, showDisabledTargets]);

  return (
    <div>
      <div className="relative mb-2">
        {loading ? (
          <Spinner className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 z-10" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50 z-10" />
        )}
        <LazyInput
          value={search}
          onChange={onSearch}
          className="pl-10 rounded-lg"
          placeholder={t('actions.move_page_to')}
        />
      </div>
      <div className="pb-2 min-h-60 max-h-80 overflow-y-auto overflow-x-hidden">
        {data.root.length > 0 && (
          <>
            <Button
              disabled
              variant="ghost"
              className="w-full whitespace-normal justify-start items-start rounded-none pb-0 h-7"
            >
              Root
            </Button>
            {data.root.map(item => (
              <FormResource
                data={item}
                key={item.id}
                editId={editId}
                onEditId={onEditId}
                onSearch={onSearch}
                onFinished={onFinished}
                resourceIds={resourceIds}
                namespaceId={namespaceId}
                disabled={disabledResourceIds.has(item.id)}
                disabledTooltip={
                  showDisabledTargets ? disabledTargetTooltip : undefined
                }
                sourceResourceType={sourceResourceType}
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
            {data.resources.map(item => (
              <FormResource
                data={item}
                key={item.id}
                editId={editId}
                onEditId={onEditId}
                onSearch={onSearch}
                onFinished={onFinished}
                resourceIds={resourceIds}
                namespaceId={namespaceId}
                disabled={disabledResourceIds.has(item.id)}
                disabledTooltip={
                  showDisabledTargets ? disabledTargetTooltip : undefined
                }
                sourceResourceType={sourceResourceType}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
