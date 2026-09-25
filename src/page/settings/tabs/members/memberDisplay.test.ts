import {
  findMemberByUserId,
  memberDisplayName,
  memberMentionSubtext,
  memberRecipientLabel,
} from './memberDisplay';

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

describe('memberRecipientLabel', () => {
  it('keeps username and email when there is no nickname', () => {
    expect(
      memberRecipientLabel({
        user_id: 'user-1',
        username: 'Alice',
        email: 'alice@example.com',
      })
    ).toBe('Alice (alice@example.com)');
  });

  it('prefixes nickname while keeping username and email searchable', () => {
    expect(
      memberRecipientLabel({
        user_id: 'user-1',
        username: 'mz2',
        email: 'wenguang.fe@gmail.com',
        nickname: '文光嘻嘻',
      })
    ).toBe('文光嘻嘻（mz2） (wenguang.fe@gmail.com)');
  });
});

describe('findMemberByUserId', () => {
  it('returns the matching namespace member', () => {
    expect(
      findMemberByUserId(
        [
          {
            user_id: 'user-1',
            username: 'Alice',
            email: 'alice@example.com',
            nickname: 'Lizhi',
            note: 'Finance',
            id: 'member-1',
            role: 'member',
            permission: 'can_view',
          },
        ],
        'user-1'
      )?.nickname
    ).toBe('Lizhi');
  });
});
