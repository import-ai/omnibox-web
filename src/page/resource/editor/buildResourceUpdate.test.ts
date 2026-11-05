import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

import { buildResourceUpdate } from './buildResourceUpdate';
import { toComparableDocument } from './contentComparison';

const document: TiptapJsonContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Original' }] },
  ],
};
const changedDocument: TiptapJsonContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Changed' }] },
  ],
};

describe('buildResourceUpdate', () => {
  it('returns no payload when title and body are unchanged', () => {
    expect(
      buildResourceUpdate({
        baselineName: 'Document',
        baselineDocument: toComparableDocument(document),
        currentName: ' Document ',
        currentDocument: document,
        getCurrentContent: () => 'Original',
        contentHash: 'hash',
        anchorSync: { comment_anchors: [] },
      })
    ).toMatchObject({ changed: false, payload: {} });
  });

  it('submits only the title when the body is unchanged', () => {
    expect(
      buildResourceUpdate({
        baselineName: 'Document',
        baselineDocument: toComparableDocument(document),
        currentName: 'Renamed',
        currentDocument: document,
        getCurrentContent: () => 'Original',
        contentHash: 'hash',
        anchorSync: { comment_anchors: [] },
      })
    ).toMatchObject({
      changed: true,
      nameChanged: true,
      bodyChanged: false,
      payload: { name: 'Renamed' },
    });
  });

  it('submits body, hash and anchor sync together for a body change', () => {
    expect(
      buildResourceUpdate({
        baselineName: 'Document',
        baselineDocument: toComparableDocument(document),
        currentName: 'Document',
        currentDocument: changedDocument,
        getCurrentContent: () => 'Changed',
        contentHash: 'hash',
        anchorSync: {
          comment_anchors: [{ thread_id: 'thread' }],
          orphaned_comment_thread_ids: ['orphan'],
        },
      })
    ).toEqual({
      changed: true,
      nameChanged: false,
      bodyChanged: true,
      payload: {
        content: 'Changed',
        expected_content_hash: 'hash',
        comment_anchors: [{ thread_id: 'thread' }],
        orphaned_comment_thread_ids: ['orphan'],
      },
    });
  });

  it('does not attach a hash when only the title changes', () => {
    expect(
      buildResourceUpdate({
        baselineName: 'Document',
        baselineDocument: toComparableDocument(document),
        currentName: 'Renamed',
        currentDocument: document,
        getCurrentContent: () => 'Original',
        contentHash: 'hash',
      }).payload
    ).toEqual({ name: 'Renamed' });
  });
});
