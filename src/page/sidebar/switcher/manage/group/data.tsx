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

interface GroupProps extends Group {
  member: Array<Member>;
  onEdit: (id: string, title: string) => void;
  refetch: () => void;
  namespace_id: string;
}

export default function GroupData(props: GroupProps) {
  const { id, title, onEdit, member, namespace_id, refetch } = props;
  const { t } = useTranslation();
  const [fold, onFold] = useState(false);
  const { groupUserData, onRemove, groupUserRefetch } = useGroupUser({
    group_id: id,
    namespace_id,
  });

  return (
    <Collapsible
      open={fold}
      onOpenChange={onFold}
      className={cn({
        '[&[data-state=open]>div>div>svg:first-child]:rotate-90': fold,
      })}
    >
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-6 flex items-center text-sm h-10 leading-10 px-2">
          <CollapsibleTrigger asChild>
            <ChevronRight className="transition-transform cursor-pointer" />
          </CollapsibleTrigger>
          <UserCard username={title} />
        </div>
        <div className="col-span-4 text-sm h-10 leading-10 px-2">
          <span>
            {t('manage.member_count', { size: groupUserData.length })}
          </span>
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2 text-sm h-10 leading-10 px-2">
          <Button size="sm" onClick={() => onEdit(id, title)}>
            {t('manage.edit')}
          </Button>
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
