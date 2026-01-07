import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ConfirmInputDialog } from '@/components/confirm-input-dialog';
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

// Role hierarchy levels: lower number = higher privilege
const ROLE_LEVEL: Record<Role, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

export interface ActionProps {
  value: Role;
  id: string;
  disabled?: boolean;
  namespace_id: string;
  namespaceName?: string;
  refetch: () => void;
  className?: string;
  hasOwner?: boolean;
  currentUserRole?: Role;
  targetUsername?: string;
}

export default function Action(props: ActionProps) {
  const {
    id,
    className,
    hasOwner,
    disabled,
    value,
    namespace_id,
    namespaceName,
    refetch,
    currentUserRole,
    targetUsername,
  } = props;
  const [remove, onRemove] = useState(false);
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [transferOwnership, setTransferOwnership] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const { t } = useTranslation();

  // All available roles
  const allRoles: Array<{
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
      value: 'admin',
      label: t('manage.admin'),
      description: t('manage.admin_desc'),
    },
    {
      value: 'member',
      label: t('manage.member'),
      description: t('manage.member_desc'),
    },
  ];

  // Check if current user can modify target based on role hierarchy
  // Owner can modify anyone, others can only modify users at levels > their own
  const currentLevel = ROLE_LEVEL[currentUserRole ?? 'member'];
  const targetLevel = ROLE_LEVEL[value];
  const canModifyTarget =
    currentUserRole === 'owner' || currentLevel < targetLevel;

  // Filter roles based on current user's role
  // Owner can assign any role
  // Others can only assign roles at levels > their own
  const availableRoles = allRoles.filter(role => {
    if (currentUserRole === 'owner') {
      return true;
    }
    return ROLE_LEVEL[role.value] > currentLevel;
  });

  const handleChange = (val: Role) => {
    // If owner is trying to transfer ownership, show confirmation dialog
    if (currentUserRole === 'owner' && val === 'owner') {
      setTransferOwnership(true);
      return;
    }

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

  const handleTransferOwnership = async () => {
    setTransferring(true);
    try {
      await http.post(`namespaces/${namespace_id}/transfer-ownership`, {
        newOwnerId: id,
        namespaceName,
      });
      toast.success(t('manage.transfer_success'));
      refetch();
    } catch {
      // Error handled by http lib
    } finally {
      setTransferring(false);
      setTransferOwnership(false);
    }
  };
  const handleRemove = () => {
    // Cannot remove if current user cannot modify target
    if (!canModifyTarget) {
      return;
    }
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

  // Disable dropdown if current user cannot modify target
  const isDisabled = disabled || !canModifyTarget;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isDisabled}
          className={cn(className, { 'opacity-40': isDisabled })}
        >
          <div className="flex items-center text-gray-600 dark:text-white">
            <span>{allRoles.find(item => item.value === value)?.label}</span>
            {!isDisabled && <ChevronDown className="h-5 w-5 ml-1" />}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          alignOffset={-10}
          className="w-[85vw] max-w-[240px]"
        >
          {availableRoles.map(item => (
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
            className="cursor-pointer justify-between hover:bg-gray-100 text-red-500"
          >
            {t('manage.remove')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Transfer Ownership Dialog */}
      <ConfirmInputDialog
        open={transferOwnership}
        onOpenChange={setTransferOwnership}
        title={t('manage.transfer_ownership_title')}
        warningTitle={t('manage.transfer_ownership_warning_title')}
        warningBody={t('manage.transfer_ownership_desc', {
          username: targetUsername,
        })}
        confirmText={namespaceName || ''}
        confirmLabel={t('manage.transfer_ownership_confirm_label', {
          name: namespaceName,
        })}
        confirmButtonText={t('manage.transfer_confirm')}
        cancelButtonText={t('cancel')}
        loading={transferring}
        onConfirm={handleTransferOwnership}
      />

      <AlertDialog open={ownerOnly}>
        <AlertDialogContent className="w-[85%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('manage.keep_one_owner')}</AlertDialogTitle>
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
