/** @jest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { Resource } from '@/interface';
import {
  fetchChildren,
  fetchResource,
  fetchRootResources,
  searchResources,
} from '@/service/resource';

import { ResourceSelect } from './index';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

jest.mock('@/components/resourcePicker', () =>
  jest.requireActual('@/components/resourcePicker/ResourcePicker')
);

jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  fetchResource: jest.fn(),
  fetchRootResources: jest.fn(),
  fetchSmartFolderChildren: jest.fn(),
  searchResources: jest.fn(),
}));

jest.mock('@/page/sidebar/store', () => {
  const state = {
    resourceSorts: { private: undefined, teamspace: undefined },
  };
  return {
    useSidebarStore: (selector: (value: typeof state) => unknown) =>
      selector(state),
  };
});

const ancestor = {
  id: 'ancestor',
  name: 'Projects',
  parent_id: 'private-root',
  resource_type: 'folder' as const,
  has_children: true,
};
const target = {
  id: 'target',
  name: 'Selected nested folder',
  parent_id: ancestor.id,
  resource_type: 'folder' as const,
};
const selectedDetail = {
  ...target,
  path: [
    { id: 'private-root', name: 'Personal' },
    { id: ancestor.id, name: ancestor.name },
    { id: target.id, name: target.name },
  ],
} as Resource;
const roots = {
  private: {
    id: 'private-root',
    name: 'Personal',
    parent_id: null,
    resource_type: 'folder',
    children: [ancestor],
  } as unknown as Resource & { children: Resource[] },
  teamspace: {
    id: 'team-root',
    name: 'Team',
    parent_id: null,
    resource_type: 'folder',
    children: [],
  } as unknown as Resource & { children: Resource[] },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function Harness({ initialId = target.id }: { initialId?: string }) {
  const [resourceId, setResourceId] = useState(initialId);
  return (
    <TooltipProvider>
      <ResourceSelect
        namespaceId="namespace"
        resourceId={resourceId}
        includePersonalAndTeam
        loading={false}
        onChange={setResourceId}
      />
      <button onClick={() => setResourceId('other')}>Switch resource</button>
    </TooltipProvider>
  );
}

describe('ResourceSelect selected resource reveal', () => {
  let container: HTMLDivElement;
  let root: Root;
  const scrollIntoView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchRootResources).mockResolvedValue(roots);
    jest.mocked(fetchResource).mockResolvedValue(selectedDetail);
    jest.mocked(fetchChildren).mockResolvedValue([target as Resource]);
    jest.mocked(searchResources).mockResolvedValue([target]);
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  const trigger = () =>
    container.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
  const row = (name: string) =>
    [
      ...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'),
    ].find(button => button.textContent?.trim() === name);
  const render = async (initialId = target.id) => {
    await act(async () => root.render(<Harness initialId={initialId} />));
  };
  const open = async () => {
    await act(async () => {
      trigger().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
  };
  const close = async () => {
    await act(async () => {
      document
        .querySelector('[role="menu"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
    });
  };
  const assertRevealed = () => {
    const selected = row(target.name);
    expect(selected?.getAttribute('aria-pressed')).toBe('true');
    expect(scrollIntoView.mock.contexts).toContain(selected);
  };

  it('expands the selected ancestor path and scrolls to the selected row', async () => {
    await render();
    await open();
    assertRevealed();
  });

  it('reveals a resource in Team without loading unrelated Personal branches', async () => {
    jest.mocked(fetchRootResources).mockResolvedValue({
      private: { ...roots.private, children: [] },
      teamspace: {
        ...roots.teamspace,
        children: [{ ...ancestor, parent_id: 'team-root' } as Resource],
      },
    });
    jest.mocked(fetchResource).mockResolvedValue({
      ...selectedDetail,
      path: [
        { id: 'team-root', name: 'Team' },
        ...selectedDetail.path!.slice(1),
      ],
    });
    await render();
    await open();
    assertRevealed();
    expect(jest.mocked(fetchChildren).mock.calls.map(([, id]) => id)).toEqual([
      ancestor.id,
    ]);
  });

  it('reveals the current selection again after closing without changing it', async () => {
    await render();
    await open();
    assertRevealed();
    await close();
    scrollIntoView.mockClear();
    await open();
    assertRevealed();
  });

  it('keeps the path after choosing the already selected resource and reopening', async () => {
    await render();
    await open();
    await act(async () => row(target.name)!.click());
    scrollIntoView.mockClear();
    await open();
    assertRevealed();
  });

  it('finishes loading the path when the current resource is selected before details arrive', async () => {
    const detail = deferred<Resource>();
    jest.mocked(fetchResource).mockReturnValue(detail.promise);
    await render();
    await open();
    const expand = row(
      ancestor.name
    )!.parentElement!.parentElement!.querySelector<HTMLButtonElement>(
      'button[aria-label]'
    )!;
    await act(async () => expand.click());
    await act(async () => row(target.name)!.click());
    await act(async () => detail.resolve(selectedDetail));
    expect(trigger().querySelector('.animate-spin')).toBeNull();
    scrollIntoView.mockClear();
    await open();
    assertRevealed();
  });

  it('retrieves a missing path even when the selected resource name is cached', async () => {
    jest
      .mocked(fetchResource)
      .mockResolvedValueOnce(target as Resource)
      .mockResolvedValue(selectedDetail);
    await render();
    expect(trigger().textContent).toContain(target.name);
    await open();
    assertRevealed();
  });

  it('keeps the path after choosing the current resource from search', async () => {
    jest.useFakeTimers();
    await render();
    await open();
    const input = document.querySelector<HTMLInputElement>('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )!.set!.call(input, 'Selected');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => jest.advanceTimersByTime(1200));
    expect(searchResources).toHaveBeenCalledWith('namespace', 'Selected');
    await act(async () => row(target.name)!.click());
    scrollIntoView.mockClear();
    await open();
    assertRevealed();
  });

  it('waits for deeper ancestors before revealing a resource below a long sibling list', async () => {
    const children = deferred<Resource[]>();
    const middle = {
      ...ancestor,
      id: 'middle',
      name: 'Nested projects',
      parent_id: ancestor.id,
    };
    jest.mocked(fetchResource).mockResolvedValue({
      ...selectedDetail,
      parent_id: middle.id,
      path: [
        ...selectedDetail.path!.slice(0, 2),
        { id: middle.id, name: middle.name },
        selectedDetail.path![2],
      ],
    });
    jest
      .mocked(fetchChildren)
      .mockImplementation((_, id) =>
        id === ancestor.id
          ? Promise.resolve([middle as Resource])
          : children.promise
      );
    await render();
    await open();
    expect(row(target.name)).toBeUndefined();
    expect(scrollIntoView).not.toHaveBeenCalled();
    await act(async () =>
      children.resolve([
        ...Array.from(
          { length: 60 },
          (_, index) =>
            ({
              ...target,
              id: `sibling-${index}`,
              name: `Earlier folder ${index}`,
              parent_id: middle.id,
            }) as Resource
        ),
        { ...target, parent_id: middle.id } as Resource,
      ])
    );
    assertRevealed();
    expect(document.querySelectorAll('button[aria-pressed]')).toHaveLength(66);
  });

  it('ignores late details for a previous selection', async () => {
    const previous = deferred<Resource>();
    const other = { ...target, id: 'other', name: 'Other folder' };
    jest
      .mocked(fetchResource)
      .mockReturnValueOnce(previous.promise)
      .mockResolvedValue({
        ...selectedDetail,
        ...other,
        path: [
          ...selectedDetail.path!.slice(0, 2),
          { id: other.id, name: other.name },
        ],
      });
    jest.mocked(fetchChildren).mockResolvedValue([target, other] as Resource[]);
    await render();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button:last-child')!.click();
    });
    await act(async () => previous.resolve(selectedDetail));
    expect(trigger().textContent).toContain(other.name);
    expect(trigger().textContent).not.toContain(target.name);
    await open();
    expect(row(other.name)?.getAttribute('aria-pressed')).toBe('true');
    expect(row(target.name)?.getAttribute('aria-pressed')).toBe('false');
  });

  it.each(['private-root', 'team-root', 'personal_and_team'])(
    'keeps the %s scope selected on reopen',
    async resourceId => {
      await render(resourceId);
      await open();
      expect(
        document.querySelector('button[aria-pressed="true"]')
      ).not.toBeNull();
      await close();
      await open();
      expect(
        document.querySelector('button[aria-pressed="true"]')
      ).not.toBeNull();
      expect(fetchResource).not.toHaveBeenCalled();
    }
  );

  it('retries unavailable selected details on open without changing the scope', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    jest
      .mocked(fetchResource)
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValue(selectedDetail);
    try {
      await render();
      await open();
      assertRevealed();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load selected resource',
        expect.any(Error)
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
