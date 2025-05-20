// import Action from './action';
import Invite from '../../invite';
import { Member } from '@/interface';
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

interface MemberProps {
  search: string;
  refetch: () => void;
  data: Array<Member>;
  onSearch: (value: string) => void;
}

export default function MemberMain(props: MemberProps) {
  const { search, data, refetch, onSearch } = props;
  const { t } = useTranslation();
  const uid = localStorage.getItem('uid');

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
              <TableHead>{t('manage.user')}</TableHead>
              {/* <TableHead className="text-right">{t('form.role')}</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.email}>
                <TableCell>
                  <UserCard
                    username={item.username}
                    email={item.email}
                    you={uid === item.id}
                  />
                </TableCell>
                {/* <TableCell className="text-right">
                  <Action value="can_comment" onChange={() => {}} />
                </TableCell> */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
