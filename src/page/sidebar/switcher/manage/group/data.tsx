import { cn } from '@/lib/utils';
import { useState } from 'react';
import AddMember from '../add-member';
import { NamespaceMember } from '@/interface';
import { ChevronRight } from 'lucide-react';
import UserCard from '@/components/user-card';
import { Button } from '@/components/ui/button';
import PopConfirm from '@/components/popconfirm';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GroupProps extends NamespaceMember {}

export default function GroupData(props: GroupProps) {
  const [fold, onFold] = useState(false);

  console.log('GroupData', props);

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
          <UserCard username="Bar" />
        </div>
        <div className="col-span-4 text-sm h-10 leading-10 px-2">
          <span>2 名成员</span>
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2 text-sm h-10 leading-10 px-2">
          <PopConfirm title="Are you sure to disable this user?">
            <Button size="sm">编辑</Button>
          </PopConfirm>
          <PopConfirm title="确定删除当前用户？">
            <Button size="sm" variant="destructive">
              删除
            </Button>
          </PopConfirm>
        </div>
      </div>
      <CollapsibleContent>
        <Separator />
        <div className="pl-8 pr-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserCard username="Bar" />
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                工作空间所有者
              </span>
            </div>
            <PopConfirm title="确定要移除此成员？">
              <Button size="sm" variant="ghost" className="hover:text-red-500">
                移除
              </Button>
            </PopConfirm>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserCard username="Bar" />
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                工作空间所有者
              </span>
            </div>
            <PopConfirm title="确定要移除此成员？">
              <Button size="sm" variant="ghost" className="hover:text-red-500">
                移除
              </Button>
            </PopConfirm>
          </div>
          <AddMember />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
