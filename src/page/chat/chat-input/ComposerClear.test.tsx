/** @jest-environment jsdom */
import { act, useImperativeHandle, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { create } from 'zustand';

import type { IResTypeContext } from './types';
import { useChatAreaDraftLifecycle } from './useChatAreaDraftLifecycle';
import { useChatInputComposer } from './useChatInputComposer';

jest.mock('@/page/chat/chatStore', () => ({
  useChatStore: (selector: (state: { inputResetNonce: number }) => unknown) =>
    selector({ inputResetNonce: 0 }),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('clears the real composer after async upload while resource context also updates', async () => {
  const store = create<{ resources: IResTypeContext[] }>(() => ({
    resources: [],
  }));
  let finishUpload!: () => void;
  function Composer() {
    const resources = store(state => state.resources);
    const [loading, setLoading] = useState(false);
    const draft = useChatAreaDraftLifecycle({
      messages: [],
      navigatePrefix: '/clear-test',
      initialQuery: 'image question',
      selectedResources: resources,
      setSelectedResources: resources => store.setState({ resources }),
    });
    const composer = useChatInputComposer({
      value: draft.query,
      tools: draft.composerTools,
      selectedResources: resources,
      onChange: draft.handleQueryChange,
      onComposerStateChange: draft.handleComposerStateChange,
      onToolsChange: draft.handleToolsChange,
      onSelectedResourcesChange: resources => store.setState({ resources }),
      disabled: loading,
      getToolLabel: tool => tool,
      untitledLabel: 'Untitled',
      onSend: () => {},
    });
    useImperativeHandle(draft.inputRef, () => composer.handle);
    return (
      <>
        <textarea
          ref={composer.textareaRef}
          value={composer.displayText}
          readOnly
        />
        <button
          onClick={async () => {
            setLoading(true);
            await new Promise<void>(resolve => {
              finishUpload = resolve;
            });
            draft.clearComposerAfterSend();
            setLoading(false);
          }}
        >
          Send
        </button>
      </>
    );
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Composer />));
    await act(async () => container.querySelector('button')!.click());
    await act(async () => finishUpload());
    expect(container.querySelector('textarea')!.value).toBe('');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
