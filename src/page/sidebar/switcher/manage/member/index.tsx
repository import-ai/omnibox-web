import Action from './action';
import Invite from '../../invite';
import { http } from '@/lib/request';
import { Member } from '@/interface';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import UserCard from '@/components/user-card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import PermissionAction from '@/components/permission-action';
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';

interface MemberProps {
  search: string;
  refetch: () => void;
  data: Array<Member>;
  namespace_id: string;
  onSearch: (value: string) => void;
}

export default function MemberMain(props: MemberProps) {
  const { search, data, namespace_id, refetch, onSearch } = props;
  const { t } = useTranslation();
  const uid = localStorage.getItem('uid');
  const [resourceId, onResourceId] = useState('');
  const isOwner =
    data.findIndex((item) => item.user_id === uid && item.role === 'owner') >=
    0;

  useEffect(() => {
    http
      .get(`/namespaces/${namespace_id}/root`, {
        params: { namespace_id: namespace_id, space_type: 'teamspace' },
      })
      .then((res) => {
        onResourceId(res.id);
      });
  }, [namespace_id]);

  return (
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Invite onFinish={refetch}>
          <Button size="sm" variant="default">
            {t('manage.add_member')}
          </Button>
        </Invite>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">{t('manage.user')}</TableHead>
              <TableHead className="w-[30%]">权限</TableHead>
              <TableHead className="text-right">角色</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <UserCard email={item.email} username={item.username} />
                </TableCell>
                <TableCell>
                  <PermissionAction
                    disabled={!isOwner}
                    value={item.level}
                    refetch={refetch}
                    user_id={item.user_id}
                    resource_id={resourceId}
                    namespace_id={namespace_id}
                    canRemove={false}
                    canNoAccess={true}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Action
                    disabled={!isOwner}
                    id={item.user_id}
                    value={item.role}
                    refetch={refetch}
                    namespace_id={namespace_id}
                    hasOwner={
                      data
                        .filter((i) => i.user_id !== item.user_id)
                        .findIndex((i) => i.role === 'owner') >= 0
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
