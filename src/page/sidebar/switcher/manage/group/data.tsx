import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import UserCard from '@/components/user-card';
import { Group, Member } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

import DataGroupUser from './data-user';
import useGroupUser from './use-group-user';

interface GroupProps extends Group {
  member: Array<Member>;
  onEdit: (id: string, title: string) => void;
  refetch: () => void;
  namespace_id: string;
}

export default function GroupData(props: GroupProps) {
  const { id, title, member, namespace_id, refetch, invitation_id } = props;
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

  return (
    <Collapsible
      open={fold}
      onOpenChange={onFold}
      className={cn({
        '[&[data-state=open]>div>div>svg:first-child]:rotate-90': fold,
      })}
    >
      <div className="flex h-[60px] items-center border-b border-border">
        <div className="flex w-[210px] items-center px-2">
          <CollapsibleTrigger asChild>
            <ChevronRight className="mr-2 size-4 cursor-pointer transition-transform" />
          </CollapsibleTrigger>
          <UserCard username={title} />
        </div>
        <div className="w-[124px] px-2">
          <span className="text-sm text-muted-foreground">
            {t('manage.member_count', { size: groupUserData.length })}
          </span>
        </div>
        <div className="flex w-[127px] items-center px-2">
          <Switch
            checked={Boolean(invitation_id)}
            onCheckedChange={handleCheckedChange}
          />
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
