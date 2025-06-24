import { cn } from '@/lib/utils';
import { useState } from 'react';
import { http } from '@/lib/request';
import DataGroupUser from './data-user';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Group, Member } from '@/interface';
import UserCard from '@/components/user-card';
import { Button } from '@/components/ui/button';
import PopConfirm from '@/components/popconfirm';
import { Separator } from '@/components/ui/separator';
import useGroupUser from './use-group-user';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import copy from 'copy-to-clipboard';

interface GroupProps extends Group {
  member: Array<Member>;
  onEdit: (id: string, title: string) => void;
  refetch: () => void;
  namespace_id: string;
}

export default function GroupData(props: GroupProps) {
  const { id, title, onEdit, member, namespace_id, refetch, invitation_id } =
    props;
  const { t } = useTranslation();
  const [fold, onFold] = useState(false);
  const [loading, setLoading] = useState(false);
  const { groupUserData, onRemove, groupUserRefetch } = useGroupUser({
    group_id: id,
    namespace_id,
  });

  const handleCheckedChange = (checked: boolean) => {
    if (loading) {
      return;
    }
    setLoading(true);
    if (checked) {
      http
        .post(`/namespaces/${namespace_id}/invitations`, {
          groupId: id,
        })
        .then(refetch)
        .finally(() => {
          setLoading(false);
        });
    } else {
      http
        .delete(`/namespaces/${namespace_id}/invitations/${invitation_id}`)
        .then(refetch)
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const handleCopyLink = () => {
    copy(`${location.origin}/invite/${namespace_id}/${invitation_id}`, {
      format: 'text/plain',
    });
  };

  return (
    <Collapsible
      open={fold}
      onOpenChange={onFold}
      className={cn({
        '[&[data-state=open]>div>div>svg:first-child]:rotate-90': fold,
      })}
    >
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-4 flex items-center text-sm h-10 leading-10 px-2">
          <CollapsibleTrigger asChild>
            <ChevronRight className="transition-transform cursor-pointer" />
          </CollapsibleTrigger>
          <UserCard username={title} />
        </div>
        <div className="col-span-2 text-sm h-10 leading-10 px-2">
          <span>
            {t('manage.member_count', { size: groupUserData.length })}
          </span>
        </div>
        <div className="col-span-2 px-2">
          <Switch
            className="data-[state=checked]:bg-blue-500"
            checked={Boolean(invitation_id)}
            onCheckedChange={handleCheckedChange}
          />
        </div>
        <div className="col-span-4 flex flex-row-reverse items-center gap-2 text-sm leading-10 px-2">
          <PopConfirm
            title={t('manage.remove_title')}
            message={t('manage.remove_desc')}
            onOk={() => {
              http
                .delete(`/namespaces/${namespace_id}/groups/${id}`)
                .then(refetch);
            }}
          >
            <Button size="sm" variant="destructive">
              {t('manage.delete')}
            </Button>
          </PopConfirm>
          <Button size="sm" onClick={() => onEdit(id, title)}>
            {t('manage.edit')}
          </Button>
          {invitation_id && (
            <Button size="sm" variant="copyLink" onClick={handleCopyLink}>
              {t('actions.copy_link')}
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent>
        <Separator />
        <DataGroupUser
          group_id={id}
          member={member}
          onRemove={onRemove}
          groupUserData={groupUserData}
          groupUserRefetch={groupUserRefetch}
          namespace_id={namespace_id}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
