import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PermissionAction from '@/components/permission-action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import UserCard from '@/components/user-card';
import { Member } from '@/interface';
import { http } from '@/lib/request';

import Invite from '../../invite';
import Action from './action';

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
    data.findIndex(item => item.user_id === uid && item.role === 'owner') >= 0;

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespace_id}/root?namespace_id=${namespace_id}`, {
        cancelToken: source.token,
      })
      .then(res => {
        onResourceId(res.teamspace.id);
      });
    return () => {
      source.cancel();
    };
  }, [namespace_id]);

  return (
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-9 w-[447px] rounded-md border-border placeholder:text-muted-foreground"
        />
        <Invite onFinish={refetch}>
          <Button size="sm" className="text-sm font-semibold">
            {t('manage.add')}
          </Button>
        </Invite>
      </div>
      <div className="border-0">
        <Table rootClassName="w-full">
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="h-10 w-[210px] px-2 text-base font-medium text-foreground">
                {t('manage.user')}
              </TableHead>
              <TableHead className="h-10 w-[124px] px-2 text-left text-base font-medium text-foreground">
                {t('manage.permission')}
              </TableHead>
              <TableHead className="h-10 w-[127px] px-2 text-left text-base font-medium text-foreground">
                {t('manage.role')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow
                key={item.user_id}
                className="h-[60px] border-b border-border"
              >
                <TableCell className="w-[210px] px-2">
                  <UserCard email={item.email || ''} username={item.username} />
                </TableCell>
                <TableCell className="w-[124px] px-2 text-left">
                  <PermissionAction
                    disabled={!isOwner}
                    value={item.permission}
                    refetch={refetch}
                    user_id={item.user_id}
                    resource_id={resourceId}
                    namespace_id={namespace_id}
                    canRemove={false}
                    canNoAccess={true}
                  />
                </TableCell>
                <TableCell className="w-[127px] px-2 text-left">
                  <Action
                    disabled={!isOwner}
                    id={item.user_id}
                    value={item.role}
                    refetch={refetch}
                    namespace_id={namespace_id}
                    hasOwner={
                      data
                        .filter(i => i.user_id !== item.user_id)
                        .findIndex(i => i.role === 'owner') >= 0
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
