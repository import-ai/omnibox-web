import {
  hasMentionCard,
  mentionCardInitial,
  mentionCardRows,
  toMentionMembersById,
} from './mentionCard';

describe('mentionCardRows', () => {
  it('omits blank fields and keeps the ones that exist', () => {
    expect(
      mentionCardRows({
        id: 'u1',
        nickname: ' 荔枝 ',
        username: 'lizhi',
        email: '   ',
        phone: ' 13800000000 ',
        note: '仅自己的备注',
      })
    ).toEqual([
      { field: 'nickname', value: '荔枝' },
      { field: 'username', value: 'lizhi' },
      { field: 'phone', value: '13800000000' },
      { field: 'note', value: '仅自己的备注' },
    ]);
  });

  it('returns no rows when every field is empty', () => {
    expect(
      mentionCardRows({
        id: 'u1',
        nickname: ' ',
        username: null,
        email: '',
        phone: undefined,
        note: undefined,
      })
    ).toEqual([]);
    expect(
      hasMentionCard({
        id: 'u1',
        nickname: ' ',
        username: null,
      })
    ).toBe(false);
    expect(hasMentionCard({ id: 'u1', avatar: ' https://cdn/a.png ' })).toBe(
      true
    );
  });
});

describe('mentionCardInitial', () => {
  it('uses nickname, then username, then email, then phone', () => {
    expect(
      mentionCardInitial({ id: 'u1', nickname: '荔枝', username: 'lizhi' })
    ).toBe('荔');
    expect(mentionCardInitial({ id: 'u1', username: 'lizhi' })).toBe('L');
    expect(mentionCardInitial({ id: 'u1', email: 'a@b.c' })).toBe('A');
    expect(mentionCardInitial({ id: 'u1', phone: '+1' })).toBe('+');
    expect(mentionCardInitial({ id: 'u1' })).toBe('?');
  });
});

describe('toMentionMembersById', () => {
  it('indexes members by user id and skips a blank id', () => {
    expect(
      toMentionMembersById([
        { user_id: ' ', username: 'skip' },
        {
          user_id: 'u1',
          username: 'lizhi',
          nickname: '荔枝',
          email: 'a@b.c',
          phone: '+86',
          note: 'note',
          avatar: 'https://cdn/a.png',
        },
      ])
    ).toEqual({
      u1: {
        id: 'u1',
        username: 'lizhi',
        nickname: '荔枝',
        email: 'a@b.c',
        phone: '+86',
        note: 'note',
        avatar: 'https://cdn/a.png',
      },
    });
  });
});
