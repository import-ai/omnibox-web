/** @jest-environment jsdom */

import * as React from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import ChatArea from './index';

const mockInputClear = jest.fn();

jest.mock('react-dnd', () => ({
  useDrop: () => [{ isResourceOver: false }, jest.fn()],
}));

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
  default: () => null,
}));

jest.mock('./ChatInput', () => ({
  __esModule: true,
  default: React.forwardRef(function MockChatInput(
    props: {
      disabled: boolean;
      images: Array<{ id: string }>;
      onImageRemove: (id: string) => void;
      onSend: () => void;
      value: string;
    },
    ref: React.ForwardedRef<unknown>
  ) {
    React.useImperativeHandle(ref, () => ({
      clear: mockInputClear,
      getDisplayParts: () => [{ type: 'text', text: props.value }],
      insertResource: jest.fn(),
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
    onImageSelect: (file: File) => void;
  }) => (
    <button
      data-testid="add-image"
      disabled={imageUploadDisabled}
      onClick={() =>
        onImageSelect(new File(['image'], 'image.png', { type: 'image/png' }))
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

  it('clears text and images immediately and blocks repeated Enter sends', async () => {
    const sendMessage = jest.fn(async () => new Promise<void>(() => undefined));

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
      composer.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })
      );
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
