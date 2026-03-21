import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/input';
import { Group, Member } from '@/interface';

import CreateGroup from './add';
import GroupData from './data';

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-7 lg:h-9 w-[150px] lg:w-[435px] text-sm rounded-md border-border placeholder:text-muted-foreground bg-transparent dark:bg-transparent"
        />
        <CreateGroup
          data={edit}
          onFinish={handleFinish}
          onToggle={handleToggle}
        />
      </div>
      <div className="overflow-auto max-w-[83vw] sm:max-w-full">
        <div className="min-w-[320px]">
          <div className="flex w-full border-b border-border sticky top-0 bg-background z-10">
            <div className="flex h-8 lg:h-10 w-[100px] lg:w-[210px] items-center px-2 text-sm lg:text-base font-medium text-foreground whitespace-nowrap">
              {t('manage.group')}
            </div>
            <div className="flex h-8 lg:h-10 w-[90px] lg:w-[115px] items-center px-2 text-sm lg:text-base font-medium text-foreground whitespace-nowrap">
              {t('manage.member')}
            </div>
            <div className="flex h-8 lg:h-10 w-[60px] lg:w-[127px] items-center justify-center text-sm lg:text-base font-medium text-foreground whitespace-nowrap">
              {t('manage.invite_link')}
            </div>
            <div className="flex h-8 lg:h-10 flex-1 items-center px-2"></div>
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
