import { Permission } from '@/interface';

import { getDisabledPermissions } from './data';

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
