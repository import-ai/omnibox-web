import { getNextShareSort } from './shareSort';

describe('getNextShareSort', () => {
  it('uses each automatic sort default and toggles the selected direction', () => {
    expect(
      getNextShareSort(
        { sort_by: 'updated_at', sort_order: 'desc' },
        'created_at'
      )
    ).toEqual({ sort_by: 'created_at', sort_order: 'desc' });
    expect(
      getNextShareSort(
        { sort_by: 'created_at', sort_order: 'desc' },
        'created_at'
      )
    ).toEqual({ sort_by: 'created_at', sort_order: 'asc' });
    expect(
      getNextShareSort({ sort_by: 'updated_at', sort_order: 'desc' }, 'title')
    ).toEqual({ sort_by: 'title', sort_order: 'asc' });
  });

  it('uses ascending order for manual sorting', () => {
    expect(
      getNextShareSort({ sort_by: 'updated_at', sort_order: 'desc' }, 'manual')
    ).toEqual({ sort_by: 'manual', sort_order: 'asc' });
  });
});
