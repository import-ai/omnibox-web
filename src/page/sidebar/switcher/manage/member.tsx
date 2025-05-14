import Invite from '../invite';
import useContext from './use-context';
import Action from '@/components/permission';
import { Input } from '@/components/ui/input';
import UserCard from '@/components/user-card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';

export default function Member() {
  const { t } = useTranslation();
  const { data, search, onSearch, permission, onPermission } = useContext();

  return (
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Invite>
          <Button size="sm" variant="default">
            添加成员
          </Button>
        </Invite>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70%]">用户</TableHead>
              <TableHead className="text-right">{t('form.role')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.email}>
                <TableCell>
                  <UserCard {...item} />
                </TableCell>
                <TableCell className="text-right">
                  <Action value={permission} onChange={onPermission} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
