import { useState } from 'react';
import { Role } from '@/interface';
import { http } from '@/lib/request';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ActionProps {
  value: Role;
  namespace_id: string;
  refetch: () => void;
  className?: string;
}

export default function Action(props: ActionProps) {
  const { className, value, namespace_id, refetch } = props;
  const [remove, onRemove] = useState(false);
  const data: Array<{
    value: Role;
    label: string;
    description?: string;
  }> = [
    {
      value: 'owner',
      label: '工作空间所有者',
      description: '可以更改工作空间设置并邀请新成员加入工作空间。',
    },
    {
      value: 'member',
      label: '成员',
      description: '无法更改工作空间设置或邀请新成员加入工作空间。',
    },
  ];
  const handleChange = (val: Role) => {
    return http
      .patch(`namespaces/${namespace_id}/members`, { role: val })
      .then(refetch);
  };
  const handleRemove = () => {
    onRemove(true);
  };
  const handleRemoveCancel = () => {
    onRemove(false);
  };
  const handleRemoveOk = () => {
    return http.delete(`namespaces/${namespace_id}/members`).then(() => {
      handleRemoveCancel();
      refetch();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={className}>
          <div className="flex items-center text-gray-700">
            <span>{data.find((item) => item.value === value)?.label}</span>
            <ChevronDown className="h-5 w-5 ml-1" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          alignOffset={-10}
          className="w-[264px]"
        >
          {data.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => handleChange(item.value)}
              className="cursor-pointer justify-between hover:bg-gray-100"
            >
              <div>
                {item.description ? (
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-gray-500 text-xs">
                        {item.description}
                      </div>
                    )}
                  </div>
                ) : (
                  item.label
                )}
              </div>
              {item.value === value && (
                <Check className="h-5 w-5 text-blue-600" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleRemove}
            className="text-red-500 cursor-pointer justify-between hover:bg-gray-100"
          >
            从工作空间移除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={remove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除自己的访问权限吗？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRemoveCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveOk}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
