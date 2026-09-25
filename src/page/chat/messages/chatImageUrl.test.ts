/** @jest-environment jsdom */

import { resolveChatImageUrl } from './chatImageUrl';

const path =
  '/api/v1/namespaces/QflKpu/resources/resource-id/attachments/image-id';

test('uses stable attachment URLs and enforces the current share scope', () => {
  expect(resolveChatImageUrl(path)).toBe(path);
  expect(resolveChatImageUrl(path, 'share-id')).toBe(
    '/api/v1/shares/share-id/resources/resource-id/attachments/image-id'
  );
  expect(resolveChatImageUrl(window.location.origin + path, 'share-id')).toBe(
    '/api/v1/shares/share-id/resources/resource-id/attachments/image-id'
  );
  expect(resolveChatImageUrl('/images/logo.png')).toBe('/images/logo.png');
  expect(resolveChatImageUrl('https://example.com/image.png')).toBe(
    'https://example.com/image.png'
  );
  for (const src of [
    undefined,
    '',
    'attachments/image-id',
    '/api/v1/namespaces/QflKpu',
    'data:image/png;base64,x',
    'javascript:alert(1)',
  ]) {
    expect(resolveChatImageUrl(src)).toBeUndefined();
  }
});
