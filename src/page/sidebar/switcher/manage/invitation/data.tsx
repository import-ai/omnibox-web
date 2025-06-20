import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Invitation } from '@/interface';
import { http } from '@/lib/request';
import { useTranslation } from 'react-i18next';

interface InvitationProps {
  namespaceId: string;
  invitation: Invitation;
  refetch: () => void;
}

export function InvitationData(props: InvitationProps) {
  const { namespaceId, invitation, refetch } = props;
  const { t } = useTranslation();
  const groupTitle = invitation.group?.title || '';
  const handleDelete = () => {
    http
      .delete(`/namespaces/${namespaceId}/invitations/${invitation.id}`)
      .then(refetch);
  };
  const handleReceiveLink = () => {};
  return (
    <TableRow key={invitation.id}>
      <TableCell>{groupTitle}</TableCell>
      <Button size="sm" onClick={handleReceiveLink}>
        {t('invite.receive_link')}
      </Button>
      <Button size="sm" variant="destructive" onClick={handleDelete}>
        {t('manage.delete')}
      </Button>
    </TableRow>
  );
}
