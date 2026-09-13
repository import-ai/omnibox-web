/** @jest-environment jsdom */

import * as React from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import ChatArea from './index';

jest.mock('./ThinkingLevelSelector', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (level: string) => void }) => (
    <button data-testid="select-high" onClick={() => onChange('basic.high')}>
      High
    </button>
  ),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn().mockResolvedValue({}) },
}));

const mockInputClear = jest.fn();
const mockResourceInsert = jest.fn();
let mockDropSpec: {
  drop: (item: unknown, monitor: { getItemType: () => string }) => void;
};
let mockQueryChange: (value: string) => void;

jest.mock('react-dnd', () => ({
  useDrop: (spec: typeof mockDropSpec) => {
    mockDropSpec = spec;
    return [{ isResourceOver: false }, jest.fn()];
  },
}));

jest.mock('react-dnd-html5-backend', () => ({ NativeTypes: { FILE: 'file' } }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/resourcePicker', () => ({
  WorkspaceResourcePicker: () => null,
}));

jest.mock('@/page/chat/chatStore', () => ({
  useChatStore: (selector: (state: { inputResetNonce: number }) => unknown) =>
    selector({ inputResetNonce: 0 }),
}));

jest.mock('./ApprovalModeSelect', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./ContextCapacityIndicator', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./DecisionInput', () => ({
  __esModule: true,
  default: ({ sendMessage }: { sendMessage: (params: unknown) => void }) => (
    <button
      data-testid="resume"
      onClick={() =>
        sendMessage({ query: '', decisions: [{ type: 'approve' }] })
      }
    >
      Resume
    </button>
  ),
}));

jest.mock('./ChatInput', () => ({
  __esModule: true,
  default: React.forwardRef(function MockChatInput(
    props: {
      disabled: boolean;
      images: Array<{ id: string }>;
      onImageRemove: (id: string) => void;
      onSend: () => void;
      onChange: (value: string) => void;
      value: string;
    },
    ref: React.ForwardedRef<unknown>
  ) {
    mockQueryChange = props.onChange;
    React.useImperativeHandle(ref, () => ({
      clear: mockInputClear,
      getDisplayParts: () => [{ type: 'text', text: props.value }],
      insertResource: mockResourceInsert,
      rememberSelection: jest.fn(),
      toggleTool: jest.fn(),
    }));
    return (
      <div>
        <textarea
          data-testid="composer"
          disabled={props.disabled}
          value={props.value}
          readOnly
          onKeyDown={event => {
            if (event.key === 'Enter' && !props.disabled) {
              event.preventDefault();
              props.onSend();
            }
          }}
        />
        <span data-testid="image-count">{props.images.length}</span>
        {props.images[0] && (
          <button
            data-testid="remove-image"
            onClick={() => props.onImageRemove(props.images[0].id)}
          >
            remove
          </button>
        )}
      </div>
    );
  }),
}));

jest.mock('./ChatTool', () => ({
  __esModule: true,
  default: ({
    imageUploadDisabled,
    onImageSelect,
  }: {
    imageUploadDisabled?: boolean;
    onImageSelect: (files: File[]) => void;
  }) => (
    <button
      data-testid="add-image"
      disabled={imageUploadDisabled}
      onClick={() =>
        onImageSelect([new File(['image'], 'image.png', { type: 'image/png' })])
      }
    >
      add image
    </button>
  ),
}));

jest.mock('./ChatAction', () => ({
  __esModule: true,
  default: ({
    disabled,
    disabledReason,
    onSend,
  }: {
    disabled: boolean;
    disabledReason?: string;
    onSend: () => void;
  }) => (
    <button
      data-disabled-reason={disabledReason}
      data-testid="send"
      disabled={disabled}
      onClick={onSend}
    >
      send
    </button>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'structuredClone', {
  configurable: true,
  value: <T,>(value: T): T => value,
});

describe('ChatArea', () => {
  let container: HTMLDivElement;
  let root: Root;
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    createObjectURL = jest.fn(() => 'blob:image');
    revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it('sends the selected Basic strength after typing and remembers it', async () => {
    (http.get as jest.Mock).mockResolvedValueOnce({
      basic: {
        default: { edition: 'basic', level: 'low' },
        levels: [
          { edition: 'basic', level: 'low' },
          { edition: 'basic', level: 'high' },
        ],
      },
    });
    const sendMessage = jest.fn();
    const onThinkingSelectionChange = jest.fn();
    await act(async () =>
      root.render(
        <ChatArea
          onThinkingSelectionChange={onThinkingSelectionChange}
          initialQuery="hello"
          loading={false}
          messages={[]}
          navigatePrefix="/namespace-a"
          selectedResources={[]}
          sendMessage={sendMessage}
          setSelectedResources={jest.fn()}
        />
      )
    );
    await act(async () =>
      (
        container.querySelector('[data-testid="select-high"]') as HTMLElement
      ).click()
    );
    await act(async () =>
      (container.querySelector('[data-testid="send"]') as HTMLElement).click()
    );
    expect(onThinkingSelectionChange).toHaveBeenLastCalledWith({
      edition: 'basic',
      level: 'high',
    });
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ edition: 'basic', level: 'high' })
    );
    expect(
      JSON.parse(localStorage.getItem('thinking-level:/namespace-a')!)
    ).toEqual({ group: 'basic', step: 'basic.high' });
  });

  it('resumes the interrupted Pro Max turn independently of the saved draft selection', async () => {
    localStorage.setItem(
      'thinking-level:/namespace-a',
      JSON.stringify({ group: 'basic', step: 'basic.low' })
    );
    const sendMessage = jest.fn();
    const messages = [
      {
        message: { role: 'user', content: 'Do it' },
        attrs: { edition: 'pro', level: 'max' },
      },
      {
        message: { role: 'assistant', content: '' },
        attrs: { tool_call: { interrupts: [{ id: 'approval' }] } },
      },
    ] as React.ComponentProps<typeof ChatArea>['messages'];
    await act(async () =>
      root.render(
        <ChatArea
          loading={false}
          messages={messages}
          navigatePrefix="/namespace-a"
          selectedResources={[]}
          setSelectedResources={jest.fn()}
          sendMessage={sendMessage}
        />
      )
    );
    await act(async () =>
      (container.querySelector('[data-testid="resume"]') as HTMLElement).click()
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        edition: 'pro',
        level: 'max',
        decisions: [{ type: 'approve' }],
      })
    );
  });

  it.each(['Enter', 'click', 'mixed'])(
    'keeps images until prepared and blocks same-batch %s sends',
    async method => {
      const sendMessage = jest.fn(
        async ({ onImagesUploaded }: { onImagesUploaded?: () => void }) => {
          onImagesUploaded?.();
          return new Promise<void>(() => undefined);
        }
      );

      await act(async () =>
        root.render(
          <ChatArea
            initialQuery="hello"
            loading={false}
            messages={[]}
            navigatePrefix="/namespace-a"
            namespaceId="namespace-a"
            selectedResources={[]}
            sendMessage={sendMessage}
            setSelectedResources={jest.fn()}
          />
        )
      );

      await act(async () => {
        (
          container.querySelector('[data-testid="add-image"]') as HTMLElement
        ).click();
      });
      expect(
        container.querySelector('[data-testid="image-count"]')?.textContent
      ).toBe('1');

      const composer = container.querySelector(
        '[data-testid="composer"]'
      ) as HTMLTextAreaElement;
      await act(async () => {
        const button = container.querySelector(
          '[data-testid="send"]'
        ) as HTMLButtonElement;
        for (let index = 0; index < 3; index++) {
          if (method === 'click' || (method === 'mixed' && index === 1)) {
            button.click();
          } else {
            composer.dispatchEvent(
              new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })
            );
          }
        }
      });

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(mockInputClear).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:image');
      expect(composer.value).toBe('');
      expect(
        container.querySelector('[data-testid="image-count"]')?.textContent
      ).toBe('0');
      expect(
        (container.querySelector('[data-testid="send"]') as HTMLButtonElement)
          .disabled
      ).toBe(true);

      await act(async () => {
        composer.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })
        );
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'blocks new text while pending and unlocks after %s',
    async outcome => {
      let finish!: () => void;
      const sendMessage = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve, reject) => {
              finish = () =>
                outcome === 'resolve'
                  ? resolve()
                  : reject(new Error('request failed'));
            })
        )
        .mockResolvedValue(undefined);
      await act(async () =>
        root.render(
          <ChatArea
            initialQuery="hello"
            loading={false}
            messages={[]}
            navigatePrefix="/namespace-a"
            selectedResources={[]}
            setSelectedResources={jest.fn()}
            sendMessage={sendMessage}
          />
        )
      );
      const button = container.querySelector(
        '[data-testid="send"]'
      ) as HTMLButtonElement;
      await act(async () => button.click());
      await act(async () => mockQueryChange('next message'));
      expect(button.disabled).toBe(true);
      await act(async () => button.click());
      expect(sendMessage).toHaveBeenCalledTimes(1);
      await act(async () => finish());
      expect(button.disabled).toBe(false);
      await act(async () => button.click());
      expect(sendMessage).toHaveBeenCalledTimes(2);
    }
  );

  it.each([false, true])(
    'validates pasted and dropped files (disabled: %s)',
    async imageUploadDisabled => {
      await act(async () =>
        root.render(
          <ChatArea
            loading={false}
            messages={[]}
            navigatePrefix="/namespace-a"
            imageUploadDisabled={imageUploadDisabled}
            selectedResources={[]}
            setSelectedResources={jest.fn()}
            sendMessage={jest.fn()}
          />
        )
      );
      const image = new File(['image'], 'image.png', { type: 'image/png' });
      const invalid = new File(['text'], 'file.txt', { type: 'text/plain' });
      const paste = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(paste, 'clipboardData', {
        value: { files: [image, invalid], getData: () => 'keep text' },
      });
      await act(async () =>
        container.querySelector('textarea')!.dispatchEvent(paste)
      );
      expect(paste.defaultPrevented).toBe(false);
      await act(async () =>
        mockDropSpec.drop(
          { files: [image, invalid] },
          { getItemType: () => 'file' }
        )
      );
      expect(
        container.querySelector('[data-testid="image-count"]')?.textContent
      ).toBe(imageUploadDisabled ? '0' : '2');
      expect(createObjectURL).toHaveBeenCalledTimes(
        imageUploadDisabled ? 0 : 2
      );
    }
  );

  it('still inserts dragged workspace resources as context', async () => {
    await act(async () =>
      root.render(
        <ChatArea
          loading={false}
          messages={[]}
          navigatePrefix="/namespace-a"
          selectedResources={[]}
          setSelectedResources={jest.fn()}
          sendMessage={jest.fn()}
        />
      )
    );
    await act(async () =>
      mockDropSpec.drop(
        { id: 'resource-1', name: 'Document', resource_type: 'doc' },
        { getItemType: () => 'card' }
      )
    );
    expect(mockResourceInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'resource-1' })
    );
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('keeps text and images after upload failure, then clears once prepared', async () => {
    const sendMessage = jest
      .fn()
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockImplementationOnce(async ({ onImagesUploaded }) =>
        onImagesUploaded()
      );
    await act(async () =>
      root.render(
        <ChatArea
          initialQuery="hello"
          loading={false}
          messages={[]}
          navigatePrefix="/namespace-a"
          selectedResources={[]}
          setSelectedResources={jest.fn()}
          sendMessage={sendMessage}
        />
      )
    );
    await act(async () =>
      (
        container.querySelector('[data-testid="add-image"]') as HTMLElement
      ).click()
    );
    await act(async () =>
      (container.querySelector('[data-testid="send"]') as HTMLElement).click()
    );
    expect(
      (container.querySelector('textarea') as HTMLTextAreaElement).value
    ).toBe('hello');
    expect(
      container.querySelector('[data-testid="image-count"]')?.textContent
    ).toBe('1');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await act(async () =>
      (container.querySelector('[data-testid="send"]') as HTMLElement).click()
    );
    expect(
      container.querySelector('[data-testid="image-count"]')?.textContent
    ).toBe('0');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image');
  });

  it('blocks sending existing images after agent credits are exhausted', async () => {
    const props = {
      initialQuery: 'hello',
      loading: false,
      messages: [],
      navigatePrefix: '/namespace-a',
      namespaceId: 'namespace-a',
      selectedResources: [],
      sendMessage: jest.fn(),
      setSelectedResources: jest.fn(),
    };

    await act(async () => root.render(<ChatArea {...props} />));
    await act(async () => {
      (
        container.querySelector('[data-testid="add-image"]') as HTMLElement
      ).click();
    });

    await act(async () =>
      root.render(<ChatArea {...props} imageUploadDisabled />)
    );

    const sendButton = container.querySelector(
      '[data-testid="send"]'
    ) as HTMLButtonElement;
    expect(sendButton.disabled).toBe(true);
    expect(sendButton.dataset.disabledReason).toBe(
      'chat.image.agent_1_1_unsupported'
    );
    expect(
      container.querySelector('[data-testid="image-count"]')?.textContent
    ).toBe('1');

    await act(async () => {
      (
        container.querySelector('[data-testid="remove-image"]') as HTMLElement
      ).click();
    });
    expect(sendButton.disabled).toBe(false);
  });
});
