/** @jest-environment jsdom */
import { act, type ComponentProps, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { trackButtonClick } from '@/lib/trackButtonClick';

import { Dialog, DialogContent, DialogTitle } from './Dialog';

jest.mock('@/lib/request', () => ({ http: {} }));

let host: HTMLDivElement;
let root: Root;
const changed = jest.fn();

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

async function renderDialog(props: ComponentProps<typeof DialogContent> = {}) {
  function Example() {
    const [open, setOpen] = useState(true);
    return (
      <Dialog
        open={open}
        onOpenChange={value => {
          changed(value);
          setOpen(value);
        }}
      >
        <DialogContent
          outsideCloseTrackName="settings_overlay_close"
          outsideCloseTarget="profile"
          aria-describedby={undefined}
          {...props}
        >
          <DialogTitle>Profile</DialogTitle>
        </DialogContent>
      </Dialog>
    );
  }
  await act(async () => root.render(<Example />));
  // Radix installs its document listener after the opening pointer event.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
  });
}

async function pointerDown(target: HTMLElement, options: MouseEventInit = {}) {
  const event = new MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    ...options,
  });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  await act(async () => {
    target.dispatchEvent(event);
    target.dispatchEvent(
      new MouseEvent('pointerup', { bubbles: true, ...options })
    );
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ...options })
    );
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

it('reports an accepted outside dismissal exactly once', async () => {
  await renderDialog();
  await pointerDown(document.body);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledWith(false);
  expect(trackButtonClick).toHaveBeenCalledTimes(1);
  expect(trackButtonClick).toHaveBeenCalledWith('settings_overlay_close', {
    dismiss: 'outside',
    target: 'profile',
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it.each([{ button: 2 }, { button: 0, ctrlKey: true }])(
  'does not report a Radix-prevented outside pointer: %j',
  async options => {
    await renderDialog();
    await pointerDown(document.body, options);
    expect(changed).not.toHaveBeenCalled();
    expect(trackButtonClick).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  }
);

it.each(['onPointerDownOutside', 'onInteractOutside'] as const)(
  'honors dismissal prevention from %s',
  async handler => {
    await renderDialog({ [handler]: (event: Event) => event.preventDefault() });
    await pointerDown(document.body);
    expect(changed).not.toHaveBeenCalled();
    expect(trackButtonClick).not.toHaveBeenCalled();
  }
);

it('keeps captcha interaction inside without reporting a close', async () => {
  await renderDialog();
  const captcha = document.createElement('div');
  captcha.id = 'aliyunCaptcha-window';
  document.body.append(captcha);
  try {
    await pointerDown(captcha);
    expect(changed).not.toHaveBeenCalled();
    expect(trackButtonClick).not.toHaveBeenCalled();
  } finally {
    captcha.remove();
  }
});
