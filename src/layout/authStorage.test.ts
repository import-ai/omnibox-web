import { shouldSyncUserOptions } from './authStorage';

describe('shouldSyncUserOptions', () => {
  it('syncs options for an authenticated app route', () => {
    expect(shouldSyncUserOptions('user-1')).toBe(true);
  });

  it('skips options for an anonymous app route', () => {
    expect(shouldSyncUserOptions(null)).toBe(false);
  });

  it('skips options for a share route with stored credentials', () => {
    expect(shouldSyncUserOptions('user-1', 'share-1')).toBe(false);
  });
});
