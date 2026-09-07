jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
  },
}));

import { getData } from './data';

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
