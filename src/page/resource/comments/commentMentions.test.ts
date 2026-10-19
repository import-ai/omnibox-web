import {
  commentMentionActive,
  commentMentionLabel,
  filterCommentMentionUsers,
  insertUserMention,
  mentionTrigger,
  splitCommentContent,
  userMentionShortcode,
} from './commentMentions';

const users = [
  { id: 'u1', name: 'Lizhi（Alice）', position: 'dev' },
  { id: 'u2', name: 'Bob', position: 'design' },
];

describe('comment mentions', () => {
  it('opens a query only at a fresh @', () => {
    expect(mentionTrigger('Hello @li', 9)).toEqual({ start: 6, query: 'li' });
    expect(mentionTrigger('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionTrigger('email@li', 8)).toBeNull();
    expect(mentionTrigger('[@ id="u1" label="A"]', 4)).toBeNull();
  });

  it('inserts the document mention shortcode and a trailing space', () => {
    expect(
      insertUserMention('Hi @li there', 3, 6, 'u1', 'Lizhi（Alice）')
    ).toEqual({
      value: 'Hi [@ id="u1" label="Lizhi（Alice）"] there',
      caret: 'Hi [@ id="u1" label="Lizhi（Alice）"]'.length,
    });
    expect(insertUserMention('@', 0, 1, 'u2', 'Bob')).toEqual({
      value: '[@ id="u2" label="Bob"] ',
      caret: '[@ id="u2" label="Bob"] '.length,
    });
    expect(userMentionShortcode('u1', 'A"B]')).toBe('[@ id="u1" label="AB"]');
  });

  it('filters members and resolves the displayed name', () => {
    expect(
      filterCommentMentionUsers(users, 'dev').map(user => user.id)
    ).toEqual(['u1']);
    expect(filterCommentMentionUsers(users, '').map(user => user.id)).toEqual([
      'u1',
      'u2',
    ]);
    const names = { u1: 'Lizhi（Alice）' };
    expect(commentMentionLabel('u1', 'Old', names)).toBe('Lizhi（Alice）');
    expect(commentMentionActive('u1', names)).toBe(true);
    expect(commentMentionLabel('gone', 'Old', names)).toBe('Old');
    expect(commentMentionActive('gone', names)).toBe(false);
    expect(splitCommentContent('Hi [@ id="gone" label="Old"]')).toEqual([
      { type: 'text', text: 'Hi ' },
      { type: 'user', id: 'gone', label: 'Old' },
    ]);
    expect(
      splitCommentContent('[@ id="r1" label="Doc" type="resource"]')
    ).toEqual([
      { type: 'text', text: '[@ id="r1" label="Doc" type="resource"]' },
    ]);
  });
});
