import type { ResourceMeta } from '@/interface';

import {
  appendMissingResourceMentions,
  createResourceMentionText,
  deleteResourceMention,
  getResourceContextType,
  insertResourceMention,
  mentionsToResources,
  updateMentionsForTextChange,
} from './composerDocument';

function resource(id: string, name: string): ResourceMeta {
  return {
    id,
    name,
    parent_id: null,
    resource_type: 'file',
    attrs: { original_name: name },
  };
}

describe('composer document', () => {
  it('treats containers with children as folder context', () => {
    expect(
      getResourceContextType({
        id: 'r1',
        name: '荔枝的爱好',
        parent_id: null,
        resource_type: 'doc',
        has_children: true,
      })
    ).toBe('folder');
  });

  it('treats leaf resources without children as resource context', () => {
    expect(
      getResourceContextType({
        id: 'r1',
        name: 'plan.md',
        parent_id: null,
        resource_type: 'doc',
        has_children: false,
      })
    ).toBe('resource');
  });

  it('inserts a resource mention at the selection and exposes selected resources', () => {
    const doc = insertResourceMention(
      { text: 'read  now', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 5, end: 5 },
      'Untitled'
    );

    expect(doc.text).toBe(`read ${createResourceMentionText('plan.md')} now`);
    expect(doc.replacedRange).toEqual({ start: 5, end: 6 });
    expect(doc.selection).toEqual({ start: 16, end: 16 });
    expect(doc.mentions).toMatchObject([
      {
        label: 'plan.md',
        start: 5,
        end: 15,
        resource: { id: 'r1' },
      },
    ]);
    expect(mentionsToResources(doc.mentions)).toEqual([
      {
        type: 'resource',
        resource: resource('r1', 'plan.md'),
      },
    ]);
  });

  it('inserts a visible trailing space and places the caret after it', () => {
    const doc = insertResourceMention(
      { text: '', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 0, end: 0 },
      'Untitled'
    );
    const tokenText = createResourceMentionText('plan.md');

    expect(doc.text).toBe(`${tokenText} `);
    expect(doc.mentions[0]).toMatchObject({ start: 0, end: tokenText.length });
    expect(doc.selection).toEqual({
      start: tokenText.length + 1,
      end: tokenText.length + 1,
    });
  });

  it('deletes a selected resource mention as an atomic range', () => {
    const inserted = insertResourceMention(
      { text: 'read  now', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 5, end: 5 },
      'Untitled'
    );
    const deleted = deleteResourceMention(
      inserted,
      {
        start: inserted.mentions[0].end,
        end: inserted.mentions[0].end,
      },
      'Backspace'
    );

    expect(deleted).toMatchObject({
      text: 'read  now',
      mention: { resource: { id: 'r1' } },
      mentions: [],
      selection: { start: 5, end: 5 },
    });
    expect(mentionsToResources(deleted?.mentions ?? [])).toEqual([]);
  });

  it('keeps the token atomic after its trailing space is deleted', () => {
    const inserted = insertResourceMention(
      { text: '', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 0, end: 0 },
      'Untitled'
    );
    const text = inserted.text.slice(0, -1);
    const mentions = updateMentionsForTextChange(
      inserted.text,
      text,
      inserted.mentions
    );
    expect(mentions).not.toBeNull();

    const deleted = deleteResourceMention(
      { text, mentions: mentions ?? [] },
      { start: text.length, end: text.length },
      'Backspace'
    );

    expect(deleted).toMatchObject({ text: '', mentions: [] });
  });

  it('finds a resource mention targeted by delete from the left boundary', () => {
    const inserted = insertResourceMention(
      { text: 'read  now', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 5, end: 5 },
      'Untitled'
    );
    const deleted = deleteResourceMention(
      inserted,
      { start: 5, end: 5 },
      'Delete'
    );

    expect(deleted?.text).toBe('read  now');
    expect(deleted?.selection).toEqual({ start: 5, end: 5 });
  });

  it('shifts mention ranges when text is inserted before a mention', () => {
    const previousText = `read ${createResourceMentionText('plan.md')}`;
    const mentions = [
      {
        id: 'r1:resource',
        label: 'plan.md',
        start: 5,
        end: 15,
        type: 'resource' as const,
        resource: resource('r1', 'plan.md'),
      },
    ];

    expect(
      updateMentionsForTextChange(
        previousText,
        `please read ${createResourceMentionText('plan.md')}`,
        mentions
      )
    ).toMatchObject([
      {
        label: 'plan.md',
        start: 12,
        end: 22,
      },
    ]);
  });

  it('rejects a text change that edits a resource mention', () => {
    const previousText = `read ${createResourceMentionText('plan.md')}`;
    const mentions = [
      {
        id: 'r1:resource',
        label: 'plan.md',
        start: 5,
        end: 15,
        type: 'resource' as const,
        resource: resource('r1', 'plan.md'),
      },
    ];

    expect(
      updateMentionsForTextChange(
        previousText,
        `read ${createResourceMentionText('plans.md')}`,
        mentions
      )
    ).toBeNull();
  });

  it('updates an existing resource mention context instead of appending a duplicate for the same resource', () => {
    const inserted = insertResourceMention(
      { text: '', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 0, end: 0 },
      'Untitled'
    );
    const synced = appendMissingResourceMentions(
      inserted,
      [{ type: 'folder', resource: resource('r1', 'plan.md') }],
      'Untitled'
    );

    expect(synced.text).toBe(inserted.text);
    expect(synced.mentions).toHaveLength(1);
    expect(synced.mentions[0]).toMatchObject({
      id: 'r1:folder',
      type: 'folder',
      start: 0,
      end: createResourceMentionText('plan.md').length,
    });
  });

  it('publishes one latest context for mentions with the same resource id', () => {
    const inserted = insertResourceMention(
      { text: '', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 0, end: 0 },
      'Untitled'
    );
    const original = inserted.mentions[0];
    const folderContext = {
      ...original,
      id: 'r1:folder',
      type: 'folder' as const,
      resource: resource('r1', 'updated-plan.md'),
    };

    expect(mentionsToResources([original, folderContext])).toEqual([
      {
        type: 'folder',
        resource: resource('r1', 'updated-plan.md'),
      },
    ]);
  });
});
