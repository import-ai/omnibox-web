import i18next from 'i18next';
import { Permission } from '@/interface';

export function getData(): Array<{
  value: Permission;
  label: string;
  description?: string;
}> {
  return [
    {
      value: 'full_access',
      label: i18next.t('permission.full_access'),
      description: i18next.t('permission.full_access_desc'),
    },
    {
      value: 'can_edit',
      label: i18next.t('permission.can_edit'),
    },
    {
      value: 'can_comment',
      label: i18next.t('permission.can_comment'),
      description: i18next.t('permission.can_comment_desc'),
    },
    {
      value: 'can_view',
      label: i18next.t('permission.can_view'),
    },
    {
      value: 'no_access',
      label: i18next.t('permission.no_access'),
    },
  ];
}
