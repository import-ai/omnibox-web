/** @jest-environment jsdom */
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import useContext from './useContext';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-router-dom', () => ({ useParams: () => ({}) }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const get = jest.mocked(http.get);
let currentContext: ReturnType<typeof useContext> | undefined;
let container: HTMLDivElement;
let root: Root;

function Probe({ compact = true }: { compact?: boolean }) {
  currentContext = useContext('space', compact);
  return null;
}

function context() {
  if (!currentContext) {
    throw new Error('Conversation hook has not mounted');
  }
  return currentContext;
}

function page(start: number, count: number, total = 25) {
  return {
    total,
    data: Array.from({ length: count }, (_, index) => ({
      id: `chat-${start + index}`,
      title: `Chat ${start + index}`,
    })),
  };
}

beforeEach(() => {
  get.mockReset();
  currentContext = undefined;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it('appends older chats once per request and stops at the end', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => {
    context().list.onPagerChange(2);
    context().list.onPagerChange(2);
  });
  expect(context().list.data.data).toHaveLength(20);
  expect(context().list.data.data[0].id).toBe('chat-0');
  expect(context().list.data.data[19].id).toBe('chat-19');
  expect(get).toHaveBeenCalledTimes(4);
  expect(get.mock.calls[3][0]).toContain('offset=10&limit=10');

  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(20, 5));
  await act(async () => context().list.onPagerChange(2));
  expect(context().list.data.data).toHaveLength(25);
  expect(context().list.hasMore).toBe(false);
  await act(async () => context().list.onPagerChange(2));
  expect(get).toHaveBeenCalledTimes(6);
});

it('retains loaded chats on failure and retries the same offset', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('Network error'));
  await act(async () => context().list.onPagerChange(2));
  expect(context().list.hasLoadError).toBe(true);
  expect(context().list.loading).toBe(false);
  expect(context().list.data.data).toHaveLength(10);
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.onPagerChange(2));
  expect(get.mock.calls[5][0]).toContain('offset=10&limit=10');
  expect(context().list.hasLoadError).toBe(false);
  expect(context().list.data.data).toHaveLength(20);
});

it('refreshes the loaded range after a rename or deletion', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe />));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.onPagerChange(2));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(1, 20, 24));
  await act(async () => context().onRemoveDone());
  expect(get.mock.calls[5][0]).toContain('offset=0&limit=20');
  expect(context().list.data.data).toHaveLength(20);
  expect(context().list.data.data[0].id).toBe('chat-1');
});

it('keeps ordinary pagination on the standalone history page', async () => {
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(0, 10));
  await act(async () => root.render(<Probe compact={false} />));
  get.mockResolvedValueOnce({}).mockResolvedValueOnce(page(10, 10));
  await act(async () => context().list.onPagerChange(2));
  expect(context().list.current).toBe(2);
  expect(context().list.data.data).toHaveLength(10);
  expect(context().list.data.data[0].id).toBe('chat-10');
});
