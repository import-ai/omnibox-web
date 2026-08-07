/** @jest-environment jsdom */

import { insertUnspecifiedChild } from './store/utils';
import { locateSidebarResource } from './utils';

const mockExpandPathTo = jest.fn();
const mockToggleSpace = jest.fn();
const mockActivate = jest.fn();
const mockSidebarState = {
  expandPathTo: mockExpandPathTo,
  toggleSpace: mockToggleSpace,
  activate: mockActivate,
  nodes: {
    target: { spaceType: 'private' },
  },
};

jest.mock('@/const', () => ({ ALLOW_FILE_EXTENSIONS: '' }));

jest.mock('@/page/sidebar/components/smart-folder', () => ({
  isSmartFolderChildResource: jest.fn(),
}));

jest.mock('./store', () => ({
  useSidebarStore: {
    getState: () => mockSidebarState,
  },
}));

describe('locateSidebarResource', () => {
  it('waits for a stable position and scrolls the sidebar container', async () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    mockExpandPathTo.mockResolvedValue(undefined);

    const container = document.createElement('div');
    container.dataset.sidebar = 'content';
    Object.defineProperty(container, 'clientHeight', { value: 100 });
    container.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const target = document.createElement('div');
    target.dataset.resourceId = 'target';
    target.getBoundingClientRect = () => ({ top: 200, height: 20 }) as DOMRect;
    container.appendChild(target);
    document.body.appendChild(container);

    const locating = locateSidebarResource('target');
    await Promise.resolve();
    frames.shift()?.(0);
    frames.shift()?.(16);
    await locating;

    expect(mockToggleSpace).toHaveBeenCalledWith('private', true);
    expect(mockActivate).toHaveBeenCalledWith('target');
    expect(container.scrollTop).toBe(160);
  });
});

describe('insertUnspecifiedChild', () => {
  it('appends in manual sort and prepends before automatic refresh', () => {
    expect(
      insertUnspecifiedChild(['first', 'second'], 'created', true)
    ).toEqual(['first', 'second', 'created']);
    expect(
      insertUnspecifiedChild(['first', 'second'], 'created', false)
    ).toEqual(['created', 'first', 'second']);
  });
});
