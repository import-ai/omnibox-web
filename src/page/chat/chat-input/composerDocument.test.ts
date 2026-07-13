import type { ResourceMeta } from '@/interface';

import {
  appendMissingResourceMentions,
  createResourceMentionText,
  deleteResourceMention,
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
  it('inserts a resource mention at the selection and exposes selected resources', () => {
    const doc = insertResourceMention(
      { text: 'read  now', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 5, end: 5 },
      'Untitled'
    );

    expect(doc.text).toBe(`read ${createResourceMentionText('plan.md')} now`);
    expect(doc.selection).toEqual({ start: 15, end: 15 });
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

  it('deletes a selected resource mention as an atomic range', () => {
    const inserted = insertResourceMention(
      { text: 'read  now', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 5, end: 5 },
      'Untitled'
    );
    const deleted = deleteResourceMention(
      inserted,
      inserted.selection,
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
});
