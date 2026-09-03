import type { ResourceCommentThread } from '@/interface';

jest.mock('@import-ai/omnibox-editor', () => ({
  findResourceCommentRange: (
    editor: ResourceCommentEditor,
    threadId: string
  ) => {
    let from = Number.POSITIVE_INFINITY;
    let to = Number.NEGATIVE_INFINITY;
    editor.state.doc.descendants((node, position) => {
      if (
        node.isText &&
        node.marks.some(
          mark =>
            mark.type.name === RESOURCE_COMMENT_MARK &&
            mark.attrs.threadId === threadId
        )
      ) {
        from = Math.min(from, position);
        to = Math.max(to, position + node.nodeSize);
      }
      return true;
    });
    return Number.isFinite(from) && Number.isFinite(to) ? { from, to } : null;
  },
}));

import {
  collectResourceCommentAnchors,
  type ResourceCommentEditor,
  restoreResourceCommentAnchors,
} from './commentAnchors';

const RESOURCE_COMMENT_MARK = 'resourceComment';

function makeThread(
  overrides: Partial<ResourceCommentThread> = {}
): ResourceCommentThread {
  return {
    id: 'thread-1',
    quoted_text: 'target',
    anchor: {
      from: 1,
      to: 4,
      prefix: '',
      suffix: '',
      content_hash: 'hash',
      status: 'active',
    },
    resolved: false,
    creator: { id: 'user-1', username: 'User' },
    comments: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeEditor(text: string) {
  const commentRanges = new Map<string, { from: number; to: number }>();
  const node = {
    isText: true,
    text,
    nodeSize: text.length,
    marks: [] as Array<{ type: { name: string }; attrs: { threadId: string } }>,
  };
  const editor = {
    isDestroyed: false,
    state: {
      doc: {
        content: { size: text.length + 2 },
        textBetween: (from: number, to: number) =>
          text.slice(Math.max(0, from - 1), Math.max(0, to - 1)),
        descendants: (
          callback: (candidate: typeof node, position: number) => boolean
        ) => {
          for (const [threadId, range] of commentRanges) {
            callback(
              {
                ...node,
                text: text.slice(range.from - 1, range.to - 1),
                nodeSize: range.to - range.from,
                marks: [
                  {
                    type: { name: RESOURCE_COMMENT_MARK },
                    attrs: { threadId },
                  },
                ],
              },
              range.from
            );
          }
          callback(node, 1);
          return true;
        },
      },
    },
    commands: {
      addResourceComment: ({
        threadId,
        from,
        to,
      }: {
        threadId: string;
        from: number;
        to: number;
      }) => {
        commentRanges.set(threadId, { from, to });
        return true;
      },
      removeResourceComment: (threadId: string) =>
        commentRanges.delete(threadId),
    },
  } as unknown as ResourceCommentEditor;
  return { commentRanges, editor };
}

describe('resource comment anchors', () => {
  it('relocates an anchor when the saved position no longer matches', () => {
    const { commentRanges, editor } = makeEditor('prefix target suffix');

    restoreResourceCommentAnchors(editor, [makeThread()]);

    expect(commentRanges.get('thread-1')).toEqual({ from: 8, to: 14 });
  });

  it('uses context to disambiguate repeated quoted text', () => {
    const { commentRanges, editor } = makeEditor('first target second target');
    const thread = makeThread({
      anchor: {
        ...makeThread().anchor,
        prefix: 'first target second ',
      },
    });

    restoreResourceCommentAnchors(editor, [thread]);

    expect(commentRanges.get('thread-1')).toEqual({ from: 21, to: 27 });
  });

  it('reports an active thread as orphaned when its mark is missing', () => {
    const { editor } = makeEditor('the original text is gone');

    expect(collectResourceCommentAnchors(editor, [makeThread()])).toEqual({
      comment_anchors: [],
      orphaned_comment_thread_ids: ['thread-1'],
    });
  });

  it('keeps resolved threads anchored so their underline remains visible', () => {
    const { commentRanges, editor } = makeEditor('prefix target suffix');
    const thread = makeThread({ resolved: true });

    restoreResourceCommentAnchors(editor, [thread]);

    expect(commentRanges.get('thread-1')).toEqual({ from: 8, to: 14 });
  });
});
