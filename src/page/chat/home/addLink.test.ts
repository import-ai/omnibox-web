import { prepareCollectUrl } from './addLink';

describe('prepareCollectUrl', () => {
  it('keeps http and https links', () => {
    expect(prepareCollectUrl('https://example.com/a?b=1')).toEqual({
      url: 'https://example.com/a?b=1',
    });
    expect(prepareCollectUrl(' http://example.com ')).toEqual({
      url: 'http://example.com',
    });
  });

  it('extracts an embedded link from surrounding text', () => {
    expect(
      prepareCollectUrl('看看 https://www.bilibili.com/video/1 这个')
    ).toEqual({
      url: 'https://www.bilibili.com/video/1',
    });
  });

  it('rejects empty, non-http, and protocol-less values', () => {
    expect(prepareCollectUrl('')).toEqual({ error: 'invalid' });
    expect(prepareCollectUrl('not a url')).toEqual({ error: 'invalid' });
    expect(prepareCollectUrl('www.example.com/path')).toEqual({
      error: 'invalid',
    });
    expect(prepareCollectUrl('javascript:alert(1)')).toEqual({
      error: 'invalid',
    });
  });

  it('rejects OmniBox links', () => {
    expect(prepareCollectUrl('https://www.omnibox.pro/s/abc')).toEqual({
      error: 'self',
    });
    expect(prepareCollectUrl('打开 https://test.omnibox.pro/chat')).toEqual({
      error: 'self',
    });
  });
});
