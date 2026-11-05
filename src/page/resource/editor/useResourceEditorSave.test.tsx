/** @jest-environment jsdom */

import type { TiptapJsonContent } from '@import-ai/omnibox-editor';
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type App from '@/hooks/app.class';
import type { Resource } from '@/interface';
import { http } from '@/lib/request';

import { toComparableDocument } from './contentComparison';
import type { EditBaseline } from './editBaseline';
import { useResourceEditorSave } from './useResourceEditorSave';

jest.mock('@import-ai/omnibox-editor', () => ({
  tiptapJsonToMarkdown: jest.fn(() => 'serialized body'),
}));

jest.mock('@/lib/request', () => ({
  http: { patch: jest.fn() },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

class FakeApp {
  private handlers = new Map<string, ((...args: unknown[]) => void)[]>();

  on(event: string, callback: (...args: unknown[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), callback]);
    return () => undefined;
  }

  fire(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach(callback => callback(...args));
  }
}

const baselineDocument: TiptapJsonContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Original' }] },
  ],
};
const changedDocument: TiptapJsonContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Changed' }] },
  ],
};

function makeBaseline(): EditBaseline {
  return {
    resourceId: 'resource',
    originalName: 'Document',
    originalContent: 'Original',
    comparableDocument: toComparableDocument(baselineDocument),
  };
}

function Harness({
  app,
  baseline,
  currentDocument = baselineDocument,
  title = 'Document',
  onContentDirtyChange,
  onResource,
  navigate,
  onSuccess,
}: {
  app: FakeApp;
  baseline: EditBaseline | null;
  currentDocument?: TiptapJsonContent;
  title?: string;
  onContentDirtyChange: jest.Mock;
  onResource: jest.Mock;
  navigate: jest.Mock;
  onSuccess: jest.Mock;
}) {
  const baselineRef = useRef(baseline);
  const bodyEditorRef = useRef({
    isDestroyed: false,
    getJSON: () => currentDocument,
  });

  useResourceEditorSave({
    app: app as unknown as App,
    baselineRef,
    bodyEditorRef,
    contentHash: 'hash',
    getAnchorSync: () => ({
      comment_anchors: [{ thread_id: 'thread' }],
      orphaned_comment_thread_ids: ['orphan'],
    }),
    locationState: null,
    namespaceId: 'namespace',
    navigate,
    onContentDirtyChange,
    onResource,
    resourceId: 'resource',
    title,
  });

  return (
    <button type="button" onClick={() => app.fire('save', onSuccess)}>
      Save
    </button>
  );
}

describe('useResourceEditorSave', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    localStorage.clear();
    jest.mocked(http.patch).mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderSave(
    props: Partial<React.ComponentProps<typeof Harness>> = {}
  ) {
    const onContentDirtyChange = jest.fn();
    const onResource = jest.fn();
    const navigate = jest.fn();
    const onSuccess = jest.fn();
    const app = new FakeApp();
    await act(async () => {
      root.render(
        <Harness
          app={app}
          baseline={makeBaseline()}
          navigate={navigate}
          onContentDirtyChange={onContentDirtyChange}
          onResource={onResource}
          onSuccess={onSuccess}
          {...props}
        />
      );
    });
    return { app, navigate, onContentDirtyChange, onResource, onSuccess };
  }

  it('finishes without PATCH when neither the title nor body changed', async () => {
    const { app, navigate, onSuccess } = await renderSave();

    act(() => app.fire('save', onSuccess));

    expect(http.patch).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/namespace/resource', {
      state: null,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('submits only the title when the body is unchanged', async () => {
    jest.mocked(http.patch).mockResolvedValue({ id: 'resource' });
    const { app } = await renderSave({ title: 'Renamed' });

    await act(async () => app.fire('save'));
    await Promise.resolve();

    expect(http.patch).toHaveBeenCalledWith(
      '/namespaces/namespace/resources/resource',
      { name: 'Renamed' }
    );
  });

  it('submits body, hash and anchors together for a body change', async () => {
    jest.mocked(http.patch).mockResolvedValue({ id: 'resource' });
    const { app } = await renderSave({ currentDocument: changedDocument });

    await act(async () => app.fire('save'));
    await Promise.resolve();

    expect(http.patch).toHaveBeenCalledWith(
      '/namespaces/namespace/resources/resource',
      {
        content: 'serialized body',
        expected_content_hash: 'hash',
        comment_anchors: [{ thread_id: 'thread' }],
        orphaned_comment_thread_ids: ['orphan'],
      }
    );
  });

  it('submits a body change when a trailing blank paragraph is added', async () => {
    jest.mocked(http.patch).mockResolvedValue({ id: 'resource' });
    const { app } = await renderSave({
      currentDocument: {
        type: 'doc',
        content: [...baselineDocument.content!, { type: 'paragraph' }],
      },
    });

    await act(async () => app.fire('save'));
    await Promise.resolve();

    expect(http.patch).toHaveBeenCalledWith(
      '/namespaces/namespace/resources/resource',
      {
        content: 'serialized body',
        expected_content_hash: 'hash',
        comment_anchors: [{ thread_id: 'thread' }],
        orphaned_comment_thread_ids: ['orphan'],
      }
    );
  });

  it('keeps one in-flight save when save is triggered repeatedly', async () => {
    let resolveRequest: ((resource: Partial<Resource>) => void) | undefined;
    jest.mocked(http.patch).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRequest = resolve;
        })
    );
    const { app } = await renderSave({ title: 'Renamed' });

    act(() => app.fire('save'));
    act(() => app.fire('save'));
    expect(http.patch).toHaveBeenCalledTimes(1);

    await act(async () => resolveRequest?.({ id: 'resource' }));
  });

  it('blocks save until the baseline is ready', async () => {
    const { app, navigate, onSuccess } = await renderSave({ baseline: null });

    act(() => app.fire('save', onSuccess));

    expect(http.patch).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('keeps the editor state when the request fails', async () => {
    jest.mocked(http.patch).mockRejectedValue(new Error('conflict'));
    const { app, navigate, onContentDirtyChange, onSuccess } = await renderSave(
      {
        currentDocument: changedDocument,
      }
    );

    await act(async () => app.fire('save', onSuccess));
    await Promise.resolve();

    expect(http.patch).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(onContentDirtyChange).not.toHaveBeenCalledWith(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
