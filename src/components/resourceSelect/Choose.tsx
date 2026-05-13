import { Check, LoaderCircle, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LazyInput } from '@/components/input/lazy';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Resource } from '@/interface';
import { cn } from '@/lib/utils';
import { fetchRootResources } from '@/service/resource';

import { ChooseWrapper } from './ChooseWrapper';
import FormResource from './FormResource';

interface IProps {
  loading: boolean;
  namespaceId: string;
  resourceId: string;
  disabledIds?: string[];
  disabledTooltip?: string;
  onChange: (val: string, key?: string) => void;
}

export function ChooseResource(props: IProps) {
  const {
    loading,
    namespaceId,
    resourceId,
    disabledIds,
    disabledTooltip,
    onChange,
  } = props;
  const { t } = useTranslation();
  const [search, onSearch] = useState('');
  const [fetching, onFetching] = useState(false);
  const [data, onData] = useState<{
    privateRootId: string;
    teamRootId: string;
    private: Array<Resource>;
    team: Array<Resource>;
  }>({
    privateRootId: '',
    teamRootId: '',
    private: [],
    team: [],
  });
  const teamData = search
    ? data.team.filter(item => item.name?.includes(search))
    : data.team;
  const privateData = search
    ? data.private.filter(item => item.name?.includes(search))
    : data.private;
  const handlePrivateClick = () => {
    onChange(data.privateRootId, 'resourceId');
    onSearch('');
  };

  useEffect(() => {
    if (loading || !namespaceId) {
      return;
    }
    onFetching(true);
    fetchRootResources(namespaceId)
      .then(response => {
        let teamRootId = '';
        let privateRootId = '';
        const items: Array<Resource> = [];
        const team: Array<Resource> = [];
        Object.keys(response).forEach(spaceType => {
          const item = response[spaceType];
          if (spaceType === 'private') {
            privateRootId = item.id;
          } else {
            teamRootId = item.id;
          }
          if (Array.isArray(item.children) && item.children.length > 0) {
            if (spaceType === 'private') {
              items.push(...item.children);
            } else {
              team.push(...item.children);
            }
          }
        });
        onData({ private: items, team, teamRootId, privateRootId });
      })
      .finally(() => {
        onFetching(false);
      });
  }, [loading, namespaceId]);

  const privateRoot = data.privateRootId ? (
    <DropdownMenuItem
      onSelect={() => {
        handlePrivateClick();
      }}
      className={cn(
        'cursor-pointer justify-between gap-1.5 rounded-lg py-2 hover:bg-gray-100 dark:text-white dark:hover:bg-neutral-900',
        {
          'bg-gray-100 dark:bg-neutral-900': data.privateRootId === resourceId,
        }
      )}
    >
      <div className="flex items-center gap-2">
        <User className="size-4 text-neutral-500" />
        <span className="text-neutral-900 dark:text-white">{t('private')}</span>
      </div>
      {data.privateRootId === resourceId && (
        <Check className="size-5 text-neutral-900" />
      )}
    </DropdownMenuItem>
  ) : null;

  return (
    <>
      <div className="relative p-0">
        {fetching ? (
          <LoaderCircle className="absolute left-3 top-3 size-4 animate-spin opacity-50 transition-transform" />
        ) : (
          <Search className="absolute left-3 top-3 size-4 opacity-50 hover:bg-transparent focus-visible:outline-none" />
        )}
        <LazyInput
          value={search}
          onChange={onSearch}
          placeholder={t('search_placeholder')}
          className="border-none pl-8 shadow-none outline-none"
        />
      </div>
      <DropdownMenuSeparator />
      <div className="no-scrollbar flex max-h-72 flex-col gap-1 overflow-y-auto">
        {privateRoot}
        <ChooseWrapper
          resourceId={resourceId}
          onSearch={onSearch}
          teamRootId={data.teamRootId}
          onChange={onChange}
        />
        {privateData.map(item => (
          <FormResource
            data={item}
            key={item.id}
            onSearch={onSearch}
            onChange={onChange}
            resourceId={resourceId}
            disabledIds={disabledIds}
            disabledTooltip={disabledTooltip}
          />
        ))}
        {teamData.map(item => (
          <FormResource
            data={item}
            key={item.id}
            onSearch={onSearch}
            onChange={onChange}
            resourceId={resourceId}
            disabledIds={disabledIds}
            disabledTooltip={disabledTooltip}
          />
        ))}
      </div>
    </>
  );
}
