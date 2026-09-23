/** @jest-environment jsdom */
import {
  readSidebarBrowseTab,
  writeSidebarBrowseTab,
} from './sidebarBrowseState';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('falls back to resources for an invalid stored tab', () => {
  writeSidebarBrowseTab('space', 'chats');
  const key = localStorage.key(0);
  if (!key) {
    throw new Error('Sidebar preference was not saved');
  }
  localStorage.setItem(key, 'invalid-tab');
  expect(readSidebarBrowseTab('space')).toBe('resources');
});

it('keeps the sidebar usable when browser storage is unavailable', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage blocked', 'SecurityError');
  });
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect(readSidebarBrowseTab('space')).toBe('resources');
  expect(() => writeSidebarBrowseTab('space', 'chats')).not.toThrow();
  expect(warning).toHaveBeenCalledTimes(2);
});

it('handles storage quota errors without interrupting tab switching', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect(() => writeSidebarBrowseTab('space', 'chats')).not.toThrow();
  expect(warning).toHaveBeenCalledTimes(1);
});
