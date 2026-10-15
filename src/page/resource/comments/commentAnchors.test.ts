import type { ResourceCommentThread } from '@/interface';

jest.mock('@import-ai/omnibox-editor', () => ({
  findResourceCommentRange: (
    editor: ResourceCommentEditor & {
      imageCommentRanges?: Map<string, { from: number; to: number }>;
    },
    threadId: string
  ) => {
    const imageRange = editor.imageCommentRanges?.get(threadId);
    if (imageRange) {
      return imageRange;
    }
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
  resolveCommentRange,
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
        nodeAt: () => null,
        textBetween: (from: number, to: number) =>
          text.slice(Math.max(0, from - 1), Math.max(0, to - 1)),
        descendants: (
          callback: (candidate: typeof node, position: number) => boolean
        ) => {
          if (commentRanges.size === 0) {
            callback(node, 1);
            return true;
          }
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
      setResourceCommentResolved: () => true,
      removeResourceComment: (threadId: string) =>
        commentRanges.delete(threadId),
    },
  } as unknown as ResourceCommentEditor;
  return { commentRanges, editor };
}

describe('resource comment anchors', () => {
  it('resolves a truncated quote near the original selection', () => {
    const { editor } = makeEditor('[超级链接](https://omnibox.pro) next line');

    expect(
      resolveCommentRange(editor, {
        from: 1,
        to: 8,
        quotedText: '级链接](https:',
      })
    ).toEqual({ from: 3, to: 14 });
  });

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

  it('does not recreate an existing underline', () => {
    const { commentRanges, editor } = makeEditor('prefix target suffix');
    commentRanges.set('thread-1', { from: 8, to: 14 });
    const add = jest.spyOn(editor.commands, 'addResourceComment');

    restoreResourceCommentAnchors(editor, [makeThread()]);

    expect(add).not.toHaveBeenCalled();
    expect(commentRanges.get('thread-1')).toEqual({ from: 8, to: 14 });
  });

  it('keeps resolved threads anchored without showing an underline', () => {
    const { commentRanges, editor } = makeEditor('prefix target suffix');
    const thread = makeThread({ resolved: true });

    restoreResourceCommentAnchors(editor, [thread]);

    expect(commentRanges.get('thread-1')).toEqual({ from: 8, to: 14 });
  });
});

const IMAGE_QUOTE =
  'omnibox-image:{"alt":"Dog","src":"https://example.com/dog.png"}';

function makeImageEditor(
  images: Array<{ from: number; to: number; alt: string; src: string }>,
  texts: Array<{ from: number; text: string }>
) {
  const imageCommentRanges = new Map<string, { from: number; to: number }>();
  const editor = {
    imageCommentRanges,
    isDestroyed: false,
    state: {
      doc: {
        content: { size: 40 },
        nodeAt: (position: number) => {
          const image = images.find(item => item.from === position);
          if (!image) {
            return null;
          }
          return {
            isText: false,
            type: { name: 'image' },
            nodeSize: image.to - image.from,
            attrs: { alt: image.alt, src: image.src },
          };
        },
        textBetween: (from: number, to: number) =>
          texts
            .map(text => {
              const textTo = text.from + text.text.length;
              const start = Math.max(from, text.from);
              const end = Math.min(to, textTo);
              if (start >= end) {
                return '';
              }
              return text.text.slice(start - text.from, end - text.from);
            })
            .join(''),
        descendants: (
          callback: (
            node: {
              isText: boolean;
              text?: string;
              nodeSize: number;
              type?: { name: string };
              attrs?: { alt: string; src: string };
              marks: Array<{
                type: { name: string };
                attrs: { threadId: string };
              }>;
            },
            position: number
          ) => boolean | void
        ) => {
          for (const text of texts) {
            callback(
              {
                isText: true,
                text: text.text,
                nodeSize: text.text.length,
                marks: [],
              },
              text.from
            );
          }
          for (const image of images) {
            callback(
              {
                isText: false,
                type: { name: 'image' },
                nodeSize: image.to - image.from,
                attrs: { alt: image.alt, src: image.src },
                marks: [],
              },
              image.from
            );
          }
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
        imageCommentRanges.set(threadId, { from, to });
        return true;
      },
      setResourceCommentResolved: () => true,
    },
  } as unknown as ResourceCommentEditor & {
    imageCommentRanges: Map<string, { from: number; to: number }>;
  };
  return { editor, imageCommentRanges };
}

describe('image resource comment anchors', () => {
  const image = {
    from: 8,
    to: 10,
    alt: 'Dog',
    src: 'https://example.com/dog.png',
  };

  it('restores a comment onto the image at the saved position', () => {
    const { editor, imageCommentRanges } = makeImageEditor(
      [image],
      [
        { from: 1, text: 'Before ' },
        { from: 10, text: ' After' },
      ]
    );

    restoreResourceCommentAnchors(editor, [
      makeThread({
        quoted_text: IMAGE_QUOTE,
        anchor: {
          ...makeThread().anchor,
          from: 8,
          to: 10,
          prefix: 'Before ',
          suffix: ' After',
        },
      }),
    ]);

    expect(imageCommentRanges.get('thread-1')).toEqual({ from: 8, to: 10 });
  });

  it('finds a moved image from its surrounding text and source', () => {
    const { editor, imageCommentRanges } = makeImageEditor(
      [image],
      [
        { from: 1, text: 'Before ' },
        { from: 10, text: ' After' },
      ]
    );

    restoreResourceCommentAnchors(editor, [
      makeThread({
        quoted_text: IMAGE_QUOTE,
        anchor: {
          ...makeThread().anchor,
          from: 1,
          to: 3,
          prefix: 'Before ',
          suffix: ' After',
        },
      }),
    ]);

    expect(imageCommentRanges.get('thread-1')).toEqual({ from: 8, to: 10 });
  });

  it('uses the image source when surrounding text matches more than one image', () => {
    const { editor, imageCommentRanges } = makeImageEditor(
      [
        { from: 0, to: 2, alt: 'One', src: 'https://example.com/one.png' },
        { from: 2, to: 4, alt: 'Two', src: 'https://example.com/two.png' },
      ],
      []
    );

    restoreResourceCommentAnchors(editor, [
      makeThread({
        quoted_text:
          'omnibox-image:{"alt":"One","src":"https://example.com/one.png"}',
        anchor: {
          ...makeThread().anchor,
          from: 20,
          to: 22,
          prefix: '',
          suffix: '',
        },
      }),
    ]);

    expect(imageCommentRanges.get('thread-1')).toEqual({ from: 0, to: 2 });
  });

  it('leaves an image comment unattached when duplicate images cannot be distinguished', () => {
    const { editor, imageCommentRanges } = makeImageEditor(
      [
        { from: 0, to: 2, alt: 'Dog', src: 'https://example.com/dog.png' },
        { from: 2, to: 4, alt: 'Dog', src: 'https://example.com/dog.png' },
      ],
      []
    );

    restoreResourceCommentAnchors(editor, [
      makeThread({
        quoted_text: IMAGE_QUOTE,
        anchor: {
          ...makeThread().anchor,
          from: 20,
          to: 22,
          prefix: '',
          suffix: '',
        },
      }),
    ]);

    expect(imageCommentRanges.has('thread-1')).toBe(false);
  });

  it('stores a readable image quote that other clients can display', () => {
    const { editor, imageCommentRanges } = makeImageEditor(
      [image],
      [{ from: 1, text: 'Before ' }]
    );
    imageCommentRanges.set('thread-1', { from: 8, to: 10 });

    expect(
      collectResourceCommentAnchors(editor, [
        makeThread({
          quoted_text: IMAGE_QUOTE,
          anchor: { ...makeThread().anchor, from: 8, to: 10 },
        }),
      ])
    ).toEqual({
      comment_anchors: [
        {
          thread_id: 'thread-1',
          from: 8,
          to: 10,
          quoted_text: '[图片]',
          prefix: 'Before ',
          suffix: '',
        },
      ],
      orphaned_comment_thread_ids: [],
    });
  });
});
