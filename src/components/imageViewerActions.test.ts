/** @jest-environment jsdom */
import { externalImageLink, originalImageDownload } from './imageViewerActions';

it('provides download only for same-origin originals and opens external HTTP(S) separately', () => {
  expect(originalImageDownload('/image.jpg', 'original.jpg')).toEqual({
    href: 'http://localhost/image.jpg',
    name: 'original.jpg',
  });
  expect(
    originalImageDownload('https://other.example/image.jpg')
  ).toBeUndefined();
  expect(externalImageLink('https://other.example/image.jpg')).toBe(
    'https://other.example/image.jpg'
  );
  expect(externalImageLink('javascript:alert(1)')).toBeUndefined();
  expect(
    externalImageLink('https://name:password@other.example/image.jpg')
  ).toBeUndefined();
});
