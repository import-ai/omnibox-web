import { getShareSortOrderOptions } from './shareSort';

describe('getShareSortOrderOptions', () => {
  it('returns time directions from oldest to newest', () => {
    expect(getShareSortOrderOptions('updated_at')).toEqual([
      { labelKey: 'oldest', value: 'asc' },
      { labelKey: 'newest', value: 'desc' },
    ]);
    expect(getShareSortOrderOptions('created_at')).toEqual([
      { labelKey: 'oldest', value: 'asc' },
      { labelKey: 'newest', value: 'desc' },
    ]);
  });

  it('returns title directions from A-Z to Z-A', () => {
    expect(getShareSortOrderOptions('title')).toEqual([
      { labelKey: 'az', value: 'asc' },
      { labelKey: 'za', value: 'desc' },
    ]);
  });
});
