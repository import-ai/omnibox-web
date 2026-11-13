/** @jest-environment jsdom */

import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

import {
  resolveShareAttachmentUrl,
  rewriteShareAttachmentUrls,
} from './shareAttachmentUrls';

const shareId = 'share-1';
const resourceId = 'resource-1';
const shareAttachment =
  '/api/v1/shares/share-1/resources/resource-1/attachments/image.png';

describe('resolveShareAttachmentUrl', () => {
  it('rebinds workspace and legacy attachment paths to the active share', () => {
    const cases = [
      '/api/v1/namespaces/namespace-1/resources/resource-1/attachments/image.png',
      '/api/v1/shares/old-share/resources/resource-1/attachments/image.png',
      '/s/old-share/resource-1/attachments/image.png',
      '/namespace-1/resource-1/attachments/image.png',
      window.location.origin + '/namespace-1/resource-1/attachments/image.png',
    ];

    for (const src of cases) {
      expect(resolveShareAttachmentUrl(src, shareId)).toBe(shareAttachment);
    }
  });

  it('preserves attachment query strings and hashes', () => {
    expect(
      resolveShareAttachmentUrl(
        '/namespace-1/resource-1/attachments/image.png?width=640#preview',
        shareId
      )
    ).toBe(`${shareAttachment}?width=640#preview`);
  });

  it('resolves document-relative attachments with the current resource', () => {
    expect(
      resolveShareAttachmentUrl(
        'attachments/image.png?width=640',
        shareId,
        resourceId
      )
    ).toBe(`${shareAttachment}?width=640`);
    expect(resolveShareAttachmentUrl('./attachments/image.png', shareId)).toBe(
      './attachments/image.png'
    );
  });

  it('leaves external and unrelated paths untouched', () => {
    const srcs = [
      'https://example.com/image.png',
      '/images/logo.png',
      '/api/v1/namespaces/namespace-1/resources/resource-1/attachments/image.png/extra',
      'data:image/png;base64,image',
    ];

    for (const src of srcs) {
      expect(resolveShareAttachmentUrl(src, shareId, resourceId)).toBe(src);
    }
  });

  it('does nothing without a share or source', () => {
    expect(resolveShareAttachmentUrl(undefined, shareId)).toBeUndefined();
    expect(
      resolveShareAttachmentUrl(
        '/namespace-1/resource-1/attachments/image.png',
        undefined
      )
    ).toBe('/namespace-1/resource-1/attachments/image.png');
  });
});

describe('rewriteShareAttachmentUrls', () => {
  it('rewrites nested image sources and attachment links in place', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'image',
              attrs: {
                src: '/api/v1/namespaces/namespace-1/resources/resource-1/attachments/image.png',
              },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'attachment',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/namespace-1/resource-1/attachments/file.pdf',
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'image',
          attrs: { src: 'https://example.com/image.png' },
        },
      ],
    } as TiptapJsonContent;

    const result = rewriteShareAttachmentUrls(content, shareId, resourceId);

    expect(result).toBe(content);
    expect(result.content?.[0].content?.[0].attrs?.src).toBe(shareAttachment);
    expect(result.content?.[1].content?.[0].marks?.[0].attrs?.href).toBe(
      '/api/v1/shares/share-1/resources/resource-1/attachments/file.pdf'
    );
    expect(result.content?.[2].attrs?.src).toBe(
      'https://example.com/image.png'
    );
  });
});
