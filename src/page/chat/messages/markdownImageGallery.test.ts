import type { ExtraProps } from 'react-markdown';

type Element = NonNullable<ExtraProps['node']>;

import {
  getMarkdownImageGallery,
  markdownImageGallery,
} from './markdownImageGallery';

const image = (alt: string): Element => ({
  type: 'element',
  tagName: 'img',
  properties: { src: '/same.jpg', alt },
  children: [],
});
const tree = (...children: Element[]) => ({ type: 'root', children });

it('assigns distinct occurrences of the same image and scopes each gallery to a single message', () => {
  const first = image('first');
  const second = image('second');
  const otherMessage = image('another message');
  markdownImageGallery()(
    tree(first, {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [second],
    })
  );
  markdownImageGallery()(tree(otherMessage));
  expect(getMarkdownImageGallery(first)).toEqual({
    index: 0,
    images: [first, second],
  });
  expect(getMarkdownImageGallery(second)).toEqual({
    index: 1,
    images: [first, second],
  });
  expect(getMarkdownImageGallery(otherMessage)).toEqual({
    index: 0,
    images: [otherMessage],
  });
});
