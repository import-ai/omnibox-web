import { getShareSortOrderOptions } from './shareSort';

describe('getShareSortOrderOptions', () => {
  it('returns time directions from newest to oldest', () => {
    expect(getShareSortOrderOptions('updated_at')).toEqual([
      { labelKey: 'newest', value: 'desc' },
      { labelKey: 'oldest', value: 'asc' },
    ]);
    expect(getShareSortOrderOptions('created_at')).toEqual([
      { labelKey: 'newest', value: 'desc' },
      { labelKey: 'oldest', value: 'asc' },
    ]);
  });

  it('returns title directions from A-Z to Z-A', () => {
    expect(getShareSortOrderOptions('title')).toEqual([
      { labelKey: 'az', value: 'asc' },
      { labelKey: 'za', value: 'desc' },
    ]);
  });
});
