import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
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
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-9 w-[435px] rounded-md border-border placeholder:text-muted-foreground"
        />
        <CreateGroup
          data={edit}
          onFinish={handleFinish}
          onToggle={handleToggle}
        />
      </div>
      <div className="border-0">
        <div className="flex w-full border-b border-border">
          <div className="flex h-10 w-[210px] items-center px-2 text-base font-medium text-foreground">
            {t('manage.group')}
          </div>
          <div className="flex h-10 w-[115px] items-center px-2 text-base font-medium text-foreground">
            {t('manage.member')}
          </div>
          <div className="flex h-10 w-[127px] items-center justify-center text-base font-medium text-foreground">
            {t('manage.invite_link')}
          </div>
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
  );
}
