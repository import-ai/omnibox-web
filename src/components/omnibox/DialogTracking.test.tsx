/** @jest-environment jsdom */
import { act, type ComponentProps, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { FolderNameDialog } from '@/components/FolderNameDialog';
import ActionDialog from '@/components/invite-dialog/ActionDialog';
import { trackButtonClick } from '@/lib/trackButtonClick';

import { Dialog, DialogContent, DialogTitle } from './Dialog';

jest.mock('@/lib/request', () => ({ http: {} }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

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

it('tracks the generated close button with its target and attributes', async () => {
  await renderDialog({ closeTrackProps: { app_id: 'telegram_bot' } });
  const button = document.querySelector('button[data-slot="dialog-close"]');
  if (!(button instanceof HTMLButtonElement))
    throw new Error('Missing close button');
  await act(async () => button.click());
  expect(changed).toHaveBeenCalledWith(false);
  expect(trackButtonClick).toHaveBeenCalledTimes(1);
  expect(trackButtonClick).toHaveBeenCalledWith('settings_profile_close', {
    app_id: 'telegram_bot',
    dismiss: 'button',
    target: 'profile',
  });
});

it('blocks outside, X and Escape dismissal while the parent is saving', async () => {
  await renderDialog({ closeDisabled: true });
  await pointerDown(document.body);
  const button = document.querySelector('button[data-slot="dialog-close"]');
  if (!(button instanceof HTMLButtonElement))
    throw new Error('Missing close button');
  await act(async () => button.click());
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
    )
  );
  expect(changed).not.toHaveBeenCalled();
  expect(trackButtonClick).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});

it('does not report folder dismissal during a pending save', async () => {
  let resolve!: () => void;
  const saving = new Promise<void>(done => {
    resolve = done;
  });
  await act(async () =>
    root.render(
      <FolderNameDialog
        open
        initialName="Folder"
        onConfirm={() => saving}
        onOpenChange={changed}
        cancelTrackName="sidebar_folder_cancel"
        confirmTrackName="sidebar_folder_create"
      />
    )
  );
  const save = Array.from(document.querySelectorAll('button')).find(
    button => button.textContent === 'create'
  );
  if (!save) throw new Error('Missing create button');
  await act(async () => save.click());
  jest.mocked(trackButtonClick).mockClear();
  await act(async () => {
    await new Promise(done => setTimeout(done, 10));
  });
  await pointerDown(document.body);
  const close = document.querySelector(
    'button[data-slot="dialog-close"]'
  ) as HTMLButtonElement;
  await act(async () => close.click());
  expect(changed).not.toHaveBeenCalled();
  expect(trackButtonClick).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  await act(async () => resolve());
  expect(changed).toHaveBeenCalledWith(false);
  expect(trackButtonClick).not.toHaveBeenCalled();
});

it('tracks the custom ActionDialog close button without double counting', async () => {
  await act(async () =>
    root.render(
      <ActionDialog
        title="Folder"
        open
        onOpenChange={changed}
        contentProps={{
          outsideCloseTrackName: 'sidebar_overlay_close',
          outsideCloseTarget: 'smart_folder',
        }}
      />
    )
  );
  const close = document.querySelector(
    'div.contents [data-slot="dialog-close"]'
  );
  if (!(close instanceof HTMLButtonElement))
    throw new Error('Missing custom close button');
  await act(async () => close.click());
  expect(changed).toHaveBeenCalledWith(false);
  expect(trackButtonClick).toHaveBeenCalledTimes(1);
  expect(trackButtonClick).toHaveBeenCalledWith('sidebar_smart_folder_close', {
    dismiss: 'button',
    target: 'smart_folder',
  });
});
