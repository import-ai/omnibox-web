import { resourceRevisionAuthorDisplayName } from './resourceRevisionAuthor';

describe('resourceRevisionAuthorDisplayName', () => {
  it('uses the backend display name when available', () => {
    expect(
      resourceRevisionAuthorDisplayName({
        id: 'user-a',
        username: 'alice',
        display_name: '荔枝（alice）',
      })
    ).toBe('荔枝（alice）');
  });

  it('falls back to the username for older API responses', () => {
    expect(
      resourceRevisionAuthorDisplayName({
        id: 'user-a',
        username: 'alice',
      })
    ).toBe('alice');
  });

  it('returns an empty string without an author', () => {
    expect(resourceRevisionAuthorDisplayName(null)).toBe('');
  });
});
