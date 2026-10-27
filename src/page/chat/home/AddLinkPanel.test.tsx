/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';
import { fetchRootResources } from '@/service/resource';

import { AddLinkPanel } from './AddLinkPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

jest.mock('sonner', () => ({
  toast: { error: jest.fn() },
}));

jest.mock('@/components/resourcePicker', () => ({
  WorkspaceResourcePicker: () => null,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/lib/request', () => ({
  http: { post: jest.fn() },
}));

jest.mock('@/service/resource', () => ({
  fetchRootResources: jest.fn(),
}));

function rootResponse(id: string) {
  return {
    private: {
      id,
      parent_id: null,
      resource_type: 'folder' as const,
      attrs: {},
    },
  };
}

function buttonByText(container: HTMLElement, label: string) {
  return [...container.querySelectorAll('button')].find(
    button => button.textContent?.trim() === label
  );
}

async function fillUrl(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('AddLinkPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('does not save into the previous namespace while the new root is loading', async () => {
    let resolveRoots: (value: ReturnType<typeof rootResponse>) => void = () =>
      undefined;
    jest.mocked(fetchRootResources).mockReturnValue(
      new Promise(resolve => {
        resolveRoots = resolve;
      })
    );
    const onSaved = jest.fn();

    await act(async () => {
      root.render(
        <AddLinkPanel
          namespaceId="namespace-b"
          onCancel={jest.fn()}
          onSaved={onSaved}
        />
      );
    });

    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    await fillUrl(input!, 'https://example.com/article');

    const save = buttonByText(container, 'chat.home.upload.save');
    expect(save?.disabled).toBe(true);
    await act(async () => {
      save?.click();
    });
    expect(http.post).not.toHaveBeenCalled();

    await act(async () => {
      resolveRoots(rootResponse('root-b'));
    });

    const enabledSave = buttonByText(container, 'chat.home.upload.save');
    expect(enabledSave?.disabled).toBe(false);
    jest.mocked(http.post).mockResolvedValue({ resource_id: 'link-1' });
    await act(async () => {
      enabledSave?.click();
    });

    expect(http.post).toHaveBeenCalledWith(
      '/namespaces/namespace-b/wizard/collect/url',
      {
        url: 'https://example.com/article',
        parentId: 'root-b',
      }
    );
    expect(onSaved).toHaveBeenCalledWith('link-1');
  });

  it('ignores cancel while saving and does not navigate after the panel is gone', async () => {
    jest.mocked(fetchRootResources).mockResolvedValue(rootResponse('root-a'));
    let resolveSave: (value: { resource_id: string }) => void = () => undefined;
    jest.mocked(http.post).mockReturnValue(
      new Promise(resolve => {
        resolveSave = resolve;
      })
    );
    const onCancel = jest.fn();
    const onSaved = jest.fn();
    const panel = (open: boolean) =>
      open ? (
        <AddLinkPanel
          namespaceId="namespace-a"
          onCancel={onCancel}
          onSaved={onSaved}
        />
      ) : null;

    await act(async () => {
      root.render(panel(true));
    });

    const input = container.querySelector('input')!;
    await fillUrl(input, 'https://example.com/article');
    await act(async () => {
      buttonByText(container, 'chat.home.upload.save')?.click();
    });

    const cancel = buttonByText(container, 'cancel');
    expect(cancel?.disabled).toBe(true);
    expect(input.disabled).toBe(true);
    await act(async () => {
      cancel?.click();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => {
      root.render(panel(false));
    });
    await act(async () => {
      resolveSave({ resource_id: 'link-1' });
    });
    expect(onSaved).not.toHaveBeenCalled();
  });
});
