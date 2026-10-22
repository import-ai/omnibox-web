import {
  applyCommentDraftChange,
  commentDraftDisplay,
  commentMentionActive,
  commentMentionLabel,
  filterCommentMentionUsers,
  insertUserMention,
  mentionMenuPlacement,
  mentionTrigger,
  openMentionTrigger,
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
    expect(mentionTrigger('user.name@host', 14)).toBeNull();
    expect(mentionTrigger('神针”@', 4)).toEqual({ start: 3, query: '' });
    expect(mentionTrigger('你好@mz', 5)).toEqual({ start: 2, query: 'mz' });
    expect(mentionTrigger('[@ id="u1" label="A"]', 4)).toBeNull();
  });

  it('does not reopen the menu on an existing mention', () => {
    const draft = commentDraftDisplay('[@ id="u1" label="Old"]');
    const end = draft.display.length;
    expect(openMentionTrigger(draft.display, end, draft.atoms)).toBeNull();
    const typing = `${draft.display} @`;
    expect(openMentionTrigger(typing, typing.length, draft.atoms)).toEqual({
      start: draft.display.length + 1,
      query: '',
    });
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

  it('opens the mention menu upward when the field is at the bottom', () => {
    expect(
      mentionMenuPlacement(
        { top: 700, bottom: 740, left: 900 },
        { width: 1200, height: 800 }
      ).bottom
    ).toBe(104);
  });

  it('shows @name in the editor while keeping the shortcode', () => {
    const stored = 'Hi [@ id="u1" label="Old"] there';
    expect(commentDraftDisplay(stored).display).toBe('Hi @Old there');
    expect(commentDraftDisplay(stored, { u1: 'New' }).display).toBe(
      'Hi @New there'
    );

    const token = '[@ id="u1" label="Old"]';
    expect(applyCommentDraftChange(stored, 'Hi @Old there!')).toBe(
      `Hi ${token} there!`
    );
    expect(applyCommentDraftChange(stored, 'Hi @Ol there')).toBe('Hi  there');
    expect(applyCommentDraftChange(stored, 'Hi @Oldthere')).toBe(
      'Hi [@ id="u1" label="Old"]there'
    );
    expect(applyCommentDraftChange(stored, 'Hi  there')).toBe('Hi  there');
    expect(
      applyCommentDraftChange(
        '[@ id="r1" label="Doc" type="resource"]',
        '[@ id="r1" label="Doc" type="resource"]'
      )
    ).toBe('[@ id="r1" label="Doc" type="resource"]');
  });
});
