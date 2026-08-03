import { fetchRssItem } from '@/service/resource';

import { getCopyContent } from './copyContent';

jest.mock('@/service/resource', () => ({
  fetchRssItem: jest.fn(),
}));

const mockedFetchRssItem = jest.mocked(fetchRssItem);

describe('getCopyContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the existing resource content outside an RSS item view', async () => {
    await expect(
      getCopyContent('namespace-1', 'resource-1', '# Resource')
    ).resolves.toBe('# Resource');
    expect(mockedFetchRssItem).not.toHaveBeenCalled();
  });

  it('fetches parsed content for an RSS item view', async () => {
    mockedFetchRssItem.mockResolvedValue({
      id: 'item-1',
      link_id: 'link-1',
      link_name: 'Example',
      title: 'Article',
      url: 'https://example.com/article',
      summary: null,
      published_at: null,
      created_at: '2026-08-03T00:00:00Z',
      parsed_content: '# RSS article',
    });

    await expect(
      getCopyContent('namespace-1', 'folder-1', undefined, 'item-1')
    ).resolves.toBe('# RSS article');
    expect(mockedFetchRssItem).toHaveBeenCalledWith(
      'namespace-1',
      'folder-1',
      'item-1'
    );
  });
});
