import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchField } from '@/components/search/SearchField';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Group, Member } from '@/interface';

import CreateGroup from './CreateGroup';
import GroupData from './GroupData';

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
    onEdit(current => (open ? { ...current, open } : { open }));
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
        <SearchField
          value={search}
          onValueChange={onSearch}
          placeholder={t('manage.search')}
          clearLabel={t('search.clear')}
          containerClassName="w-full max-w-sm min-w-0 flex-1"
        />
        <CreateGroup
          data={edit}
          onFinish={handleFinish}
          onToggle={handleToggle}
        />
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('manage.group')}</TableHead>
              <TableHead>{t('manage.member')}</TableHead>
              <TableHead className="text-center">
                {t('manage.invite_link')}
              </TableHead>
              <TableHead className="text-right">
                {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
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
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('manage.no_results')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
