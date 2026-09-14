/** @jest-environment jsdom */

import {
  cacheMessageDisplayParts,
  getCachedMessageDisplayParts,
} from './messageDisplayPartsCache';

describe('image display part cache', () => {
  it('round-trips valid images and rejects malformed image or resource parts', () => {
    const image = {
      type: 'image' as const,
      attachment_id: 'image-id',
      name: 'image.png',
      preview_url: '/preview/image-id',
    };
    cacheMessageDisplayParts('message', [image]);
    expect(getCachedMessageDisplayParts('message')).toEqual([image]);
    for (const part of [
      { ...image, preview_url: null },
      { type: 'resource', resource: null },
    ]) {
      sessionStorage.setItem(
        'chat:message-display-parts:v1:message',
        JSON.stringify([part])
      );
      expect(getCachedMessageDisplayParts('message')).toBeUndefined();
    }
  });
});
