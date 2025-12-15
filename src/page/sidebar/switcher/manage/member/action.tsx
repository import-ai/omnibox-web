import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Role } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

export interface ActionProps {
  value: Role;
  id: string;
  disabled?: boolean;
  namespace_id: string;
  refetch: () => void;
  className?: string;
  hasOwner?: boolean;
}

export default function Action(props: ActionProps) {
  const { id, className, hasOwner, disabled, value, namespace_id, refetch } =
    props;
  const [remove, onRemove] = useState(false);
  const [ownerOnly, setOwnerOnly] = useState(false);
  const { t } = useTranslation();
  const data: Array<{
    value: Role;
    label: string;
    description?: string;
  }> = [
    {
      value: 'owner',
      label: t('manage.owner'),
      description: t('manage.owner_desc'),
    },
    {
      value: 'member',
      label: t('manage.member'),
      description: t('manage.member_desc'),
    },
  ];
  const handleChange = (val: Role) => {
    return http
      .patch(
        `namespaces/${namespace_id}/members/${id}`,
        { role: val },
        { mute: true }
      )
      .then(refetch)
      .catch(err => {
        if (err?.response?.data?.code === 'no_owner_afterwards') {
          setOwnerOnly(true);
        }
      });
  };
  const handleRemove = () => {
    if (hasOwner) {
      onRemove(true);
    } else {
      setOwnerOnly(true);
    }
  };
  const handleRemoveCancel = () => {
    onRemove(false);
  };
  const handleOwnerOnly = () => {
    setOwnerOnly(false);
  };
  const handleRemoveOk = () => {
    return http.delete(`namespaces/${namespace_id}/members/${id}`).then(() => {
      handleRemoveCancel();
      refetch();
      toast.success(t('manage.member_remove_success'), {
        position: 'bottom-right',
      });
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn(className, { 'opacity-40': disabled })}
        >
          <div className="flex items-center text-gray-600 dark:text-white">
            <span>{data.find(item => item.value === value)?.label}</span>
            {!disabled && <ChevronDown className="h-5 w-5 ml-1" />}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          alignOffset={-10}
          className="w-[85vw] max-w-[240px]"
        >
          {data.map(item => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => handleChange(item.value)}
              className="cursor-pointer justify-between hover:bg-gray-100"
            >
              <div>
                {item.description ? (
                  <div>
                    <div>{item.label}</div>
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
            {t('manage.remove')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={ownerOnly}>
        <AlertDialogContent className="w-[85%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('manage.keep_one_admin')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleOwnerOnly}>
              {t('ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={remove}>
        <AlertDialogContent className="w-[85%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('manage.sure_to_remove')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRemoveCancel}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveOk}>
              {t('ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
