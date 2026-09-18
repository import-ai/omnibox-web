import { memberDisplayName, memberMentionSubtext } from './memberDisplay';

describe('memberDisplayName', () => {
  it('shows nickname with username in parentheses', () => {
    expect(
      memberDisplayName({
        user_id: 'user-1',
        username: 'Alice',
        email: 'alice@example.com',
        nickname: 'Lizhi',
      })
    ).toBe('Lizhi（Alice）');
  });

  it('hides duplicate parentheses when nickname equals username', () => {
    expect(
      memberDisplayName({
        user_id: 'user-1',
        username: 'Alice',
        email: 'alice@example.com',
        nickname: 'Alice',
      })
    ).toBe('Alice');
  });

  it('falls back to username when nickname is missing', () => {
    expect(
      memberDisplayName({
        user_id: 'user-1',
        username: 'Alice',
        email: 'alice@example.com',
        nickname: null,
      })
    ).toBe('Alice');
  });
});

describe('memberMentionSubtext', () => {
  it('keeps private note and email searchable in the mention picker', () => {
    expect(
      memberMentionSubtext({
        role: 'member',
        email: 'alice@example.com',
        note: 'Finance',
      })
    ).toBe('Finance alice@example.com');
  });
});
