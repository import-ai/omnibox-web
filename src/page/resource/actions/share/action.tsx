import { useState } from 'react';
import { Permission } from '@/interface';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
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

interface ActionProps {
  value: Permission;
  className?: string;
  onChange: (value: Permission) => void;
}

export default function Action(props: ActionProps) {
  const { className, value, onChange } = props;
  const [grant, onGrant] = useState(false);
  const [remove, onRemove] = useState(false);
  const [permission, onPermission] = useState<Permission>('full_access');
  const data = [
    {
      value: 'all',
      label: '全部权限',
      description: '编辑、建议、评论以及与他人分享',
    },
    {
      value: 'edit',
      label: '可以编辑',
    },
    {
      value: 'comment',
      label: '可以评论',
      description: '建议和评论',
    },
    {
      value: 'read',
      label: '可以查看',
    },
    {
      value: 'share',
      label: '可以分享',
    },
  ];
  const handleChange = (val: string) => {
    const oldIndex = data.findIndex((item) => item.value === value);
    const newIndex = data.findIndex((item) => item.value === val);
    if (oldIndex < newIndex) {
      onPermission(val);
      return;
    }
    onChange(val);
  };
  const handleCancel = () => {
    onPermission('full_access');
  };
  const handleOk = () => {
    onChange(permission);
    handleCancel();
  };
  const handleRemove = () => {
    onRemove(true);
  };
  const handleRemoveCancel = () => {
    onRemove(false);
  };
  const handleRemoveOk = () => {
    handleGrant();
    handleRemoveCancel();
  };
  const handleGrant = () => {
    onGrant(true);
  };
  const handleGrantOk = () => {
    onGrant(false);
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
            移除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={!!permission}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要降级自己的访问权限吗？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleOk}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <AlertDialog open={grant}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              在移除此权限之前，请向其他人授予“全部权限”。
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="w-full" onClick={handleGrantOk}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
