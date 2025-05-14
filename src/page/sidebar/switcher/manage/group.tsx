import { cn } from '@/lib/utils';
import AddMember from './add-member';
import UserCard from '@/components/user-card';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import PopConfirm from '@/components/popconfirm';
import { ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function Group() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          placeholder={t('manage.search')}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Button size="sm" variant="default">
          创建群组
        </Button>
      </div>
      <div className="rounded-md border">
        <div className="border-gray-200">
          <div className="grid grid-cols-12 text-gray-500 border-b border-gray-200">
            <div className="col-span-6 text-sm h-10 leading-10 px-2">群组</div>
            <div className="col-span-4 text-sm h-10 leading-10 px-2">成员</div>
            <div className="col-span-2 text-sm h-10 leading-10 px-2"></div>
          </div>
          <div className="border-gray-200">
            <Collapsible
              className={cn({
                '[&[data-state=open]>div>div>svg:first-child]:rotate-90': true,
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:text-red-500"
                      >
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:text-red-500"
                      >
                        移除
                      </Button>
                    </PopConfirm>
                  </div>
                  <AddMember />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
