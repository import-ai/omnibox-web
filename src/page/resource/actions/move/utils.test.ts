import { shouldDisableMoveTarget } from './utils';

describe('shouldDisableMoveTarget', () => {
  it.each(['rss_folder', 'smart_folder'] as const)(
    'disables %s in the move resource picker',
    targetResourceType => {
      expect(shouldDisableMoveTarget('folder', targetResourceType)).toBe(true);
      expect(shouldDisableMoveTarget('smart_folder', targetResourceType)).toBe(
        true
      );
    }
  );

  it('keeps a normal folder available for a normal resource', () => {
    expect(shouldDisableMoveTarget('doc', 'folder')).toBe(false);
  });
});
