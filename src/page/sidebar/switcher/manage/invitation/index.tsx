import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Group, Invitation } from '@/interface';
import { AddGroupInvitation } from './add';
import { InvitationData } from './data';

interface InvitationProps {
  namespaceId: string;
  invitations: Array<Invitation>;
  groups: Array<Group>;
  search: string;
  onSearch: (value: string) => void;
  refetch: () => void;
}
export function InvitationMain(props: InvitationProps) {
  const { namespaceId, invitations, groups, search, onSearch, refetch } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleOpen = (value: boolean) => {
    setOpen(value);
  };

  const handleFinish = () => {
    setOpen(false);
    refetch();
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
        <AddGroupInvitation
          namespaceId={namespaceId}
          groups={groups}
          open={open}
          onOpen={handleOpen}
          onFinish={handleFinish}
        />
      </div>
      <div className="rounded-md border">
        <Table rootClassName="max-w-[83vw] sm:w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">{t('manage.group')}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((item) => (
              <InvitationData
                namespaceId={namespaceId}
                invitation={item}
                refetch={refetch}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
