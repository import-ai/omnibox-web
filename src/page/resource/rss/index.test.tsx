/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { RssItem } from '@/interface';
import { fetchRssItems } from '@/service/resource';

import RssItems from './index';

const navigate = jest.fn();
const on = jest.fn(() => () => {});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', t: (key: string) => key },
  }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));
jest.mock('@/assets/icons/ResourceIcon', () => ({
  __esModule: true,
  default: () => <svg data-testid="resource-icon" />,
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ on }),
}));
jest.mock('@/service/resource', () => ({
  fetchRssItems: jest.fn(),
}));

const mockedFetchRssItems = jest.mocked(fetchRssItems);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function item(id: string, overrides: Partial<RssItem> = {}): RssItem {
  return {
    id,
    link_id: 'link',
    link_name: 'Engadget',
    title: `Title ${id}`,
    url: 'https://example.com/article',
    summary: null,
    published_at: '2026-02-20T09:00:00',
    created_at: '2026-02-20T09:00:00',
    ...overrides,
  };
}

describe('RssItems', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  async function render() {
    await act(async () => {
      root.render(<RssItems resourceId="folder-1" namespaceId="namespace-1" />);
    });
  }

  it('groups items by their published date', async () => {
    mockedFetchRssItems.mockResolvedValue([
      item('a', { published_at: '2026-03-15T09:00:00' }),
      item('b', { published_at: '2026-02-20T09:00:00' }),
      item('c', { published_at: '2026-01-05T09:00:00' }),
    ]);

    await render();

    const headers = Array.from(
      container.querySelectorAll('p.text-muted-foreground.font-light')
    ).map(node => node.textContent);
    expect(headers).toEqual(['date.today', 'February 2026', 'January 2026']);
    expect(container.textContent).toContain('Title a');
    expect(container.textContent).toContain('2026-02-20 09:00:00');
  });

  it('falls back to the item creation date when there is no published date', async () => {
    mockedFetchRssItems.mockResolvedValue([
      item('a', { published_at: null, created_at: '2026-03-14T09:00:00' }),
    ]);

    await render();

    expect(container.textContent).toContain('date.yesterday');
    expect(container.textContent).toContain('2026-03-14 09:00:00');
  });

  it('renders the source letter badge and falls back to the resource icon', async () => {
    mockedFetchRssItems.mockResolvedValue([
      item('a'),
      item('b', { link_name: null }),
    ]);

    await render();

    expect(container.textContent).toContain('E');
    expect(
      container.querySelectorAll('[data-testid="resource-icon"]')
    ).toHaveLength(1);
  });
});
