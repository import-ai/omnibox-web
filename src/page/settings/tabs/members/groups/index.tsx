import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/input';
import { Group, Member } from '@/interface';

import CreateGroup from './group-add';
import GroupData from './group-list';

interface GroupProps {
  search: string;
  refetch: () => void;
  data: Array<Group>;
  member: Array<Member>;
  namespace_id: string;
  onSearch: (value: string) => void;
}

export default function GroupMain(props: GroupProps) {
  const { search, refetch, data, member, onSearch, namespace_id } = props;
  const { t } = useTranslation();
  const [edit, onEdit] = useState<{
    id?: string;
    title?: string;
    open: boolean;
  }>({
    title: '',
    open: false,
  });
  const handleFinish = () => {
    onEdit({ open: false });
    refetch();
  };
  const handleToggle = (open: boolean) => {
    onEdit({ open });
  };
  const handleEdit = (id: string, title: string) => {
    onEdit({
      id,
      title,
      open: true,
    });
  };

  return (
    <div className="space-y-2 lg:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-7 w-[150px] rounded-md border-border bg-transparent text-sm placeholder:text-muted-foreground dark:bg-transparent lg:h-9 lg:w-[435px]"
        />
        <CreateGroup
          data={edit}
          onFinish={handleFinish}
          onToggle={handleToggle}
        />
      </div>
      <div className="max-w-[83vw] overflow-auto sm:max-w-full">
        <div className="min-w-[320px]">
          <div className="sticky top-0 z-10 flex w-full border-b border-border bg-background">
            <div className="flex h-8 w-[100px] items-center whitespace-nowrap px-2 text-sm font-medium text-foreground lg:h-10 lg:w-[210px] lg:text-base">
              {t('manage.group')}
            </div>
            <div className="flex h-8 w-[90px] items-center whitespace-nowrap px-2 text-sm font-medium text-foreground lg:h-10 lg:w-[115px] lg:text-base">
              {t('manage.member')}
            </div>
            <div className="flex h-8 w-[60px] items-center justify-center whitespace-nowrap text-sm font-medium text-foreground lg:h-10 lg:w-[127px] lg:text-base">
              {t('manage.invite_link')}
            </div>
            <div className="flex h-8 flex-1 items-center px-2 lg:h-10"></div>
          </div>
          <div className="w-full">
            {data.map(item => (
              <GroupData
                key={item.id}
                {...item}
                member={member}
                refetch={refetch}
                onEdit={handleEdit}
                namespace_id={namespace_id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
