/** @jest-environment jsdom */

import { createElement, useRef } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  focusTitleTextArea,
  locationStateWithoutFocusTitle,
  newFileEditorLocationState,
  shouldFocusNewFileTitle,
  useFocusNewFileTitle,
} from './focusNewFileTitle';

const navigate = jest.fn();
let locationState: unknown = null;

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/namespace/created/edit',
    search: '',
    hash: '',
    state: locationState,
  }),
  useNavigate: () => navigate,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('new file title focus', () => {
  it('marks a newly created file so the editor focuses the title', () => {
    expect(newFileEditorLocationState()).toEqual({
      fromSidebar: true,
      focusTitle: true,
    });
    expect(shouldFocusNewFileTitle(newFileEditorLocationState())).toBe(true);
    expect(shouldFocusNewFileTitle({ fromSidebar: true })).toBe(false);
    expect(
      locationStateWithoutFocusTitle({
        fromSidebar: true,
        focusTitle: true,
        sidebarActiveKey: 'created',
      })
    ).toEqual({
      fromSidebar: true,
      sidebarActiveKey: 'created',
    });
  });

  it('places the caret at the end of the title', () => {
    const textarea = document.createElement('textarea');
    textarea.value = '笔记';
    document.body.appendChild(textarea);

    focusTitleTextArea(textarea);

    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(2);
    textarea.remove();
  });

  it('focuses the title once for a new file and drops the one-shot flag', () => {
    locationState = newFileEditorLocationState();
    navigate.mockClear();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    function Probe() {
      const titleRef = useRef<{ textArea: HTMLTextAreaElement | null }>({
        textArea: null,
      });
      useFocusNewFileTitle(titleRef);
      return createElement('textarea', {
        defaultValue: '',
        'aria-label': 'title',
        ref: (node: HTMLTextAreaElement | null) => {
          titleRef.current.textArea = node;
        },
      });
    }

    act(() => {
      root = createRoot(container);
      root.render(createElement(Probe));
    });

    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(document.activeElement).toBe(textarea);
    expect(navigate).toHaveBeenCalledWith(
      { pathname: '/namespace/created/edit', search: '', hash: '' },
      { replace: true, state: { fromSidebar: true } }
    );

    act(() => root!.unmount());
    container.remove();
  });

  it('does not move focus when an existing file opens for edit', () => {
    locationState = { fromSidebar: true };
    navigate.mockClear();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    let root: Root;
    function Probe() {
      const titleRef = useRef<{ textArea: HTMLTextAreaElement | null }>({
        textArea: null,
      });
      useFocusNewFileTitle(titleRef);
      return createElement('textarea', {
        'aria-label': 'title',
        ref: (node: HTMLTextAreaElement | null) => {
          titleRef.current.textArea = node;
        },
      });
    }

    act(() => {
      root = createRoot(container);
      root.render(createElement(Probe));
    });

    expect(document.activeElement).toBe(outside);
    expect(navigate).not.toHaveBeenCalled();

    act(() => root!.unmount());
    container.remove();
    outside.remove();
  });
});
