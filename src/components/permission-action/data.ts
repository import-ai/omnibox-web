import i18next from 'i18next';

import { Permission } from '@/interface';

export function getDisabledPermissions(
  data: Array<{ value: Permission }>,
  value: Permission,
  restricted: boolean
): Permission[] {
  if (!restricted) {
    return [];
  }

  const currentIndex = data.findIndex(item => item.value === value);
  return currentIndex < 0
    ? []
    : data.slice(currentIndex + 1).map(item => item.value);
}

export function getData(removeNoAccess?: boolean): Array<{
  value: Permission;
  label: string;
  description?: string;
}> {
  if (removeNoAccess) {
    return [
      {
        value: 'full_access',
        label: i18next.t('permission.full_access'),
        description: i18next.t('permission.full_access_desc'),
      },
      {
        value: 'can_edit',
        label: i18next.t('permission.can_edit'),
        description: i18next.t('permission.can_edit_desc'),
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
    ];
  }
  return [
    {
      value: 'full_access',
      label: i18next.t('permission.full_access'),
      description: i18next.t('permission.full_access_desc'),
    },
    {
      value: 'can_edit',
      label: i18next.t('permission.can_edit'),
      description: i18next.t('permission.can_edit_desc'),
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
