import Invite from '../invite';
import { NamespaceMember } from '@/interface';
import { Input } from '@/components/ui/input';
import UserCard from '@/components/user-card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import Action from '@/components/permission-action';
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
  data: Array<NamespaceMember>;
  onSearch: (value: string) => void;
}

export default function Member(props: MemberProps) {
  const { search, data, refetch, onSearch } = props;
  const { t } = useTranslation();

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
                  <UserCard email={item.email} />
                </TableCell>
                <TableCell className="text-right">
                  <Action value="can_comment" onChange={() => {}} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
