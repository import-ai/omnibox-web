/** @jest-environment jsdom */
import { externalImageLink } from './imageViewerActions';

it('opens only external HTTP(S) originals without credentials', () => {
  expect(externalImageLink('https://other.example/image.jpg')).toBe(
    'https://other.example/image.jpg'
  );
  expect(externalImageLink('javascript:alert(1)')).toBeUndefined();
  expect(
    externalImageLink('https://name:password@other.example/image.jpg')
  ).toBeUndefined();
});
