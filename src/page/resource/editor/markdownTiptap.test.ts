import { contentToTiptapJson } from './markdownTiptap';

describe('contentToTiptapJson', () => {
  it('resolves standalone markdown image paths with link base', () => {
    expect(
      contentToTiptapJson('![avatar](attachments/avatar.png)', {
        linkBase: 'resource-id',
      })
    ).toEqual({
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            src: 'resource-id/attachments/avatar.png',
            alt: 'avatar',
            title: null,
            showCaption: false,
          },
        },
      ],
    });
  });

  it('lifts markdown image nodes out of paragraph content', () => {
    expect(
      contentToTiptapJson('before ![avatar](attachments/avatar.png) after', {
        linkBase: 'resource-id',
      })
    ).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'before ' }],
        },
        {
          type: 'image',
          attrs: {
            src: 'resource-id/attachments/avatar.png',
            alt: 'avatar',
            title: null,
            showCaption: false,
          },
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: ' after' }],
        },
      ],
    });
  });
});
