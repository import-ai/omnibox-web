/** @jest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import { trackButtonClick } from '@/lib/trackButtonClick';

import ApprovalModeSelect from './ApprovalModeSelect';
import ChatAction from './ChatAction';
import ChatTool from './ChatTool';
import ThinkingLevelSelector from './ThinkingLevelSelector';
import { ChatMode } from './types';

jest.mock('@/const', () => ({ FORCE_ASK: true }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('./thinkingLevelSelector.css', () => ({}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
class TestPointerEvent extends MouseEvent {
  pointerType = 'mouse';
  pointerId = 1;
}
Object.assign(window, {
  PointerEvent: TestPointerEvent,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
Object.assign(HTMLElement.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  scrollIntoView: () => {},
});
let root: Root;
let container: HTMLDivElement;
const tracked = jest.mocked(trackButtonClick);
async function renderControl(control: React.ReactNode) {
  await act(async () =>
    root.render(<TooltipProvider>{control}</TooltipProvider>)
  );
}
async function pointerOpen(button: Element) {
  await act(async () => {
    button.dispatchEvent(
      new TestPointerEvent('pointerdown', { bubbles: true, button: 0 })
    );
  });
}
async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}
beforeEach(() => {
  tracked.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
for (const surface of ['home', 'conversation'] as const) {
  const context = { surface };
  it(`${surface}: records the real Radix tool opening before click and does not double count click`, async () => {
    await renderControl(
      <ChatTool
        {...context}
        tools={[]}
        onBeforeOpen={() => {}}
        onToolToggle={() => {}}
        onResourceSelect={() => {}}
        onImageSelect={() => {}}
        renderResourcePicker={() => null}
      />
    );
    const button = container.querySelector(
      'button[aria-label="chat.tools.more"]'
    )!;
    await pointerOpen(button);
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    expect(tracked).toHaveBeenCalledWith(
      'chat_tool_open',
      expect.objectContaining({ surface })
    );
    await click(button);
    expect(
      tracked.mock.calls.filter(([name]) => name === 'chat_tool_open')
    ).toHaveLength(1);
  });
  it(`${surface}: records permission opening and selection with source`, async () => {
    const setMode = jest.fn();
    await renderControl(
      <ApprovalModeSelect
        {...context}
        approvalMode="manual"
        setApprovalMode={setMode}
      />
    );
    await pointerOpen(container.querySelector('button')!);
    expect(tracked).toHaveBeenCalledWith('chat_approval_open', { surface });
    const item = [...document.querySelectorAll('[role="menuitem"]')].find(
      item => item.textContent?.includes('mode.auto_approve')
    )!;
    await click(item);
    expect(setMode).toHaveBeenCalledWith('auto_approve');
    expect(tracked).toHaveBeenCalledWith('chat_approval_select', {
      surface,
      mode: 'auto_approve',
    });
  });
  it(`${surface}: tool submenu clicks retain source and disabled image does not report`, async () => {
    await renderControl(
      <ChatTool
        {...context}
        tools={[]}
        onBeforeOpen={() => {}}
        onToolToggle={() => {}}
        onResourceSelect={() => {}}
        onImageSelect={() => {}}
        imageUploadDisabled
        renderResourcePicker={() => null}
      />
    );
    await pointerOpen(container.querySelector('button')!);
    const image = [...document.querySelectorAll('[role="menuitem"]')].find(
      item => item.textContent?.includes('chat.image.add')
    )!;
    await click(image);
    expect(
      tracked.mock.calls.filter(([name]) => name === 'chat_image_upload')
    ).toHaveLength(0);
    const web = [...document.querySelectorAll('[role="menuitem"]')].find(item =>
      item.textContent?.includes('tools.web_search')
    )!;
    await click(web);
    expect(tracked).toHaveBeenCalledWith('chat_tool_toggle', {
      surface,
      tool: 'web_search',
    });
  });
  it(`${surface}: send and stop carry source with actual Button tracking`, async () => {
    const send = jest.fn(),
      stop = jest.fn();
    const props = {
      ...context,
      disabled: false,
      onSend: send,
      onStop: stop,
      loading: false,
      waitingForAssistantDelta: false,
      mode: ChatMode.ASK,
      setMode: () => {},
    };
    await renderControl(<ChatAction {...props} />);
    await click(container.querySelector('button')!);
    expect(send).toHaveBeenCalledTimes(1);
    expect(tracked).toHaveBeenCalledWith(
      'chat_message_send',
      expect.objectContaining({ surface })
    );
    await renderControl(<ChatAction {...props} loading />);
    await click(container.querySelector('button')!);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(tracked).toHaveBeenCalledWith(
      'chat_response_cancel',
      expect.objectContaining({ surface })
    );
  });

  it(`${surface}: actual resource and image actions retain source`, async () => {
    const props = {
      ...context,
      tools: [],
      onBeforeOpen: () => {},
      onToolToggle: () => {},
      onResourceSelect: () => {},
      onImageSelect: () => {},
      renderResourcePicker: () => null,
    };
    await renderControl(<ChatTool {...props} />);
    await pointerOpen(container.querySelector('button')!);
    await click(
      [...document.querySelectorAll('[role="menuitem"]')].find(item =>
        item.textContent?.includes('chat.image.add')
      )!
    );
    expect(tracked).toHaveBeenCalledWith('chat_image_upload', { surface });
    await pointerOpen(container.querySelector('button')!);
    await click(
      [...document.querySelectorAll('[role="menuitem"]')].find(item =>
        item.textContent?.includes('chat.tools.select_resource')
      )!
    );
    expect(tracked).toHaveBeenCalledWith('chat_resource_open', { surface });
  });
  it(`${surface}: keyboard open and Escape close record one permission opening`, async () => {
    await renderControl(
      <ApprovalModeSelect
        {...context}
        approvalMode="manual"
        setApprovalMode={() => {}}
      />
    );
    const button = container.querySelector('button')!;
    await act(async () => {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
    });
    expect(tracked).toHaveBeenCalledWith('chat_approval_open', { surface });
    await act(async () => {
      document
        .querySelector('[role="menu"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
    });
    expect(
      tracked.mock.calls.filter(([name]) => name === 'chat_approval_open')
    ).toHaveLength(1);
  });
  it(`${surface}: disabled send does not emit a click event`, async () => {
    await renderControl(
      <ChatAction
        {...context}
        disabled
        onSend={jest.fn()}
        loading={false}
        waitingForAssistantDelta={false}
        mode={ChatMode.ASK}
        setMode={() => {}}
      />
    );
    await click(container.querySelector('button')!);
    expect(tracked).not.toHaveBeenCalled();
  });
  it(`${surface}: thinking opening and level selection carry source`, async () => {
    const level = jest.fn();
    await renderControl(
      <ThinkingLevelSelector
        {...context}
        config={{
          default: {
            default: { edition: 'basic', level: 'low' },
            levels: [
              { edition: 'basic', level: 'low' },
              { edition: 'basic', level: 'high' },
            ],
          },
        }}
        group="default"
        value={{ edition: 'basic', level: 'low' }}
        onGroupChange={() => {}}
        onChange={level}
      />
    );
    await click(container.querySelector('button')!);
    expect(tracked).toHaveBeenCalledWith('chat_thinking_open', { surface });
    const slider = document.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )!.set!.call(slider, '1');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(level).toHaveBeenCalledWith('basic.high');
    expect(tracked).toHaveBeenCalledWith('chat_thinking_select', {
      surface,
      level: 'basic.high',
    });
  });
}
