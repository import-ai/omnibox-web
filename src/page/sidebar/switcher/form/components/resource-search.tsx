import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import type { Resource } from '@/interface';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Search, LoaderCircle, File, Folder } from 'lucide-react';
import { LazyInput } from '@/components/input/lazy';

interface ResourceItemProps {
  resource: Resource;
  spaceType?: string;
  onSelect: (resourceId: string) => void;
  selected: boolean;
}

function ResourceItem({
  resource,
  spaceType,
  onSelect,
  selected,
}: ResourceItemProps) {
  const { t } = useTranslation();
  let name = resource.name || t('untitled');

  if ((!resource.parent_id || resource.parent_id === '0') && spaceType) {
    name = t(spaceType);
  }

  return (
    <Button
      variant={selected ? 'secondary' : 'ghost'}
      className="w-full flex h-auto whitespace-normal justify-start items-center font-normal rounded-none gap-2"
      onClick={() => onSelect(resource.id)}
    >
      {resource.resource_type === 'folder' ? (
        <Folder className="w-4 h-4 shrink-0" />
      ) : (
        <File className="w-4 h-4 shrink-0" />
      )}
      <div className="text-left truncate">{name}</div>
    </Button>
  );
}

interface ResourceSearchProps {
  namespaceId: string;
  value: string;
  onValueChange: (resourceId: string) => void;
  placeholder?: string;
}

export default function ResourceSearch({
  namespaceId,
  value,
  onValueChange,
  placeholder,
}: ResourceSearchProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    root: Array<Resource & { spaceType?: string }>;
    resources: Array<Resource>;
  }>({
    root: [],
    resources: [],
  });

  useEffect(() => {
    setLoading(true);
    if (!search) {
      http
        .get(`/namespaces/${namespaceId}/root?namespace_id=${namespaceId}`)
        .then(response => {
          const root: Array<Resource & { spaceType?: string }> = [];
          const resources: Array<Resource> = [];

          Object.keys(response).forEach(spaceType => {
            const item = response[spaceType];
            if (!item.id) {
              return;
            }
            root.push({ ...item, spaceType });
            if (Array.isArray(item.children) && item.children.length > 0) {
              resources.push(...item.children);
            }
          });
          setData({ root, resources });
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    http
      .get(
        `/namespaces/${namespaceId}/resources/search?name=${encodeURIComponent(search)}`
      )
      .then(response => {
        setData({
          root: [],
          resources: response,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search, namespaceId]);

  return (
    <div className="space-y-2">
      <div className="relative">
        {loading ? (
          <LoaderCircle className="absolute left-3 top-[10px] size-4 opacity-50 transition-transform animate-spin" />
        ) : (
          <Search className="absolute left-3 top-[10px] size-4 opacity-50" />
        )}
        <LazyInput
          value={search}
          onChange={setSearch}
          className="pl-10"
          placeholder={placeholder || t('search.placeholder')}
        />
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-md">
        {data.root.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b bg-muted/30">
              Root
            </div>
            {data.root.map(item => (
              <ResourceItem
                key={item.id}
                resource={item}
                spaceType={item.spaceType}
                onSelect={onValueChange}
                selected={value === item.id}
              />
            ))}
          </>
        )}

        {data.resources.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b bg-muted/30">
              Resources
            </div>
            {data.resources.map(item => (
              <ResourceItem
                key={item.id}
                resource={item}
                onSelect={onValueChange}
                selected={value === item.id}
              />
            ))}
          </>
        )}

        {!loading && data.root.length === 0 && data.resources.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {search ? t('search.no_results') : t('search.resources')}
          </div>
        )}
      </div>
    </div>
  );
}
