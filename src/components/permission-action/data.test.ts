jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
  },
}));

import { Permission } from '@/interface';

import { getData, getDisabledPermissions } from './data';

describe('permission option descriptions', () => {
  it('includes descriptions for every permission that has additional capabilities', () => {
    expect(getData(true)).toEqual([
      {
        value: 'full_access',
        label: 'permission.full_access',
        description: 'permission.full_access_desc',
      },
      {
        value: 'can_edit',
        label: 'permission.can_edit',
        description: 'permission.can_edit_desc',
      },
      {
        value: 'can_comment',
        label: 'permission.can_comment',
        description: 'permission.can_comment_desc',
      },
      {
        value: 'can_view',
        label: 'permission.can_view',
      },
    ]);
  });

  it('keeps no access available only when requested', () => {
    expect(getData().at(-1)).toEqual({
      value: 'no_access',
      label: 'permission.no_access',
    });
  });
});

const permissions: Array<{ value: Permission }> = [
  { value: 'full_access' },
  { value: 'can_edit' },
  { value: 'can_comment' },
  { value: 'can_view' },
  { value: 'no_access' },
];

describe('getDisabledPermissions', () => {
  it('disables every lower permission for an owner with full access', () => {
    expect(getDisabledPermissions(permissions, 'full_access', true)).toEqual([
      'can_edit',
      'can_comment',
      'can_view',
      'no_access',
    ]);
  });

  it('only disables permissions below the current permission', () => {
    expect(getDisabledPermissions(permissions, 'can_comment', true)).toEqual([
      'can_view',
      'no_access',
    ]);
  });

  it('does not disable options for unrestricted users', () => {
    expect(getDisabledPermissions(permissions, 'full_access', false)).toEqual(
      []
    );
  });
});
