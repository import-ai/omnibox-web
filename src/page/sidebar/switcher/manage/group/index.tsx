import GroupData from './data';
import CreateGroup from './add';
import { useState } from 'react';
import { Group, Member } from '@/interface';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

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
      <div className="flex items-center justify-between flex-wrap">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <CreateGroup
          data={edit}
          onFinish={handleFinish}
          onToggle={handleToggle}
        />
      </div>
      <div className="rounded-md border">
        <div className="overflow-auto max-w-[83vw] sm:w-full">
          <div className="w-full grid grid-cols-12 text-muted-foreground border-b font-bold">
            <div className="col-span-6 text-sm h-10 leading-10 px-2">
              {t('manage.group')}
            </div>
            <div className="col-span-4 text-sm h-10 leading-10 px-2">
              {t('manage.member')}
            </div>
            <div className="col-span-2 min-w-[100px] text-sm h-10 leading-10 px-2"></div>
          </div>
          <div>
            {data.map((item) => (
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
