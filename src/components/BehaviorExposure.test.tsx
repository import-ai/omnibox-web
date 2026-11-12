/** @jest-environment jsdom */
import { act, createRef, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { BehaviorExposure } from '@/components/BehaviorExposure';
import { Button } from '@/components/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';

jest.mock('@/lib/behaviorTracking', () => ({ useBehaviorSurface: jest.fn() }));
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
HTMLElement.prototype.scrollIntoView = jest.fn();
Object.assign(globalThis, {
  DOMRect: class {
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    left = 0;
    right = 0;
    top = 0;
    bottom = 0;
    static fromRect(r: DOMRectInit = {}) {
      return new this(r.x, r.y, r.width, r.height);
    }
    constructor(x = 0, y = 0, width = 0, height = 0) {
      Object.assign(this, {
        x,
        y,
        width,
        height,
        left: x,
        right: x + width,
        top: y,
        bottom: y + height,
      });
    }
  },
});
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
const exposure = (child: ReactElement, active = true) => (
  <BehaviorExposure target="resource_creation_entry" active={active}>
    {child}
  </BehaviorExposure>
);
const byText = (text: string) =>
  [...document.querySelectorAll<HTMLElement>('button,[role=menuitem]')].find(
    e => e.textContent === text
  )!;
const click = async (text: string) => {
  await act(async () => byText(text).click());
};

for (const active of [true, false]) {
  test(`Tooltip > Exposure > Button preserves business click when active=${active}`, async () => {
    const business = jest.fn();
    await act(async () =>
      root.render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {exposure(<Button onClick={business}>business</Button>, active)}
            </TooltipTrigger>
            <TooltipContent>hint</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    );
    await click('business');
    expect(business).toHaveBeenCalledTimes(1);
  });
}
test('Exposure without an injecting parent keeps the business handler', async () => {
  const business = jest.fn();
  await act(async () =>
    root.render(exposure(<Button onClick={business}>business</Button>))
  );
  await click('business');
  expect(business).toHaveBeenCalledTimes(1);
});
test('Exposure preserves child ref', async () => {
  const ref = createRef<HTMLButtonElement>();
  await act(async () =>
    root.render(exposure(<Button ref={ref}>business</Button>))
  );
  expect(ref.current).toBe(byText('business'));
});
test.each(['focus', 'pointermove'])(
  'Tooltip ref and %s handler reach the actual trigger',
  async input => {
    jest.useFakeTimers();
    try {
      await act(async () =>
        root.render(
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {exposure(<Button>business</Button>)}
              </TooltipTrigger>
              <TooltipContent>hint</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      );
      await act(async () => {
        if (input === 'focus') byText('business').focus();
        else {
          const move = new MouseEvent('pointermove', { bubbles: true });
          Object.defineProperty(move, 'pointerType', { value: 'mouse' });
          byText('business').dispatchEvent(move);
        }
        jest.runOnlyPendingTimers();
      });
      expect(document.querySelector('[role=tooltip]')?.textContent).toBe(
        'hint'
      );
    } finally {
      jest.useRealTimers();
    }
  }
);
for (const variant of ['dropdown', 'context'] as const) {
  for (const input of ['mouse', 'keyboard'] as const) {
    test(`${variant} > Exposure > Item keeps business ${input} selection`, async () => {
      const business = jest.fn();
      const select = jest.fn();
      const item =
        variant === 'dropdown' ? (
          <DropdownMenuItem onClick={business} onSelect={select}>
            choose
          </DropdownMenuItem>
        ) : (
          <ContextMenuItem onClick={business} onSelect={select}>
            choose
          </ContextMenuItem>
        );
      await act(async () =>
        root.render(
          <TooltipProvider>
            {variant === 'dropdown' ? (
              <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>open</DropdownMenuTrigger>
                <DropdownMenuContent>{exposure(item)}</DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <ContextMenu onOpenChange={() => {}}>
                <ContextMenuTrigger>rightclick</ContextMenuTrigger>
                <ContextMenuContent forceMount>
                  {exposure(item)}
                </ContextMenuContent>
              </ContextMenu>
            )}
          </TooltipProvider>
        )
      );
      if (variant === 'context')
        await act(async () =>
          document
            .querySelector('[data-slot="context-menu-trigger"]')!
            .dispatchEvent(
              new MouseEvent('contextmenu', {
                bubbles: true,
                clientX: 30,
                clientY: 30,
              })
            )
        );
      if (input === 'keyboard') {
        await act(async () => {
          byText('choose').focus();
          byText('choose').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
          );
        });
      } else await click('choose');
      expect(business).toHaveBeenCalledTimes(1);
      expect(select).toHaveBeenCalledTimes(1);
    });
  }
}
test('disabled menu item under Tooltip > Exposure cannot execute business action', async () => {
  const business = jest.fn();
  await act(async () =>
    root.render(
      <TooltipProvider>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <Tooltip>
              <TooltipTrigger asChild>
                {exposure(
                  <DropdownMenuItem disabled aria-disabled onSelect={business}>
                    blocked
                  </DropdownMenuItem>
                )}
              </TooltipTrigger>
              <TooltipContent>disabled</TooltipContent>
            </Tooltip>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    )
  );
  await click('blocked');
  expect(business).not.toHaveBeenCalled();
});
test('Exposure around Popover content retains nested action and dismissal', async () => {
  const business = jest.fn();
  const change = jest.fn();
  await act(async () =>
    root.render(
      <Popover defaultOpen onOpenChange={change}>
        <PopoverTrigger>open</PopoverTrigger>
        {exposure(
          <PopoverContent>
            <button onClick={business}>inside</button>
          </PopoverContent>
        )}
      </Popover>
    )
  );
  await click('inside');
  expect(business).toHaveBeenCalledTimes(1);
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
  );
  expect(change).toHaveBeenCalledWith(false);
});

test('baseline Tooltip directly around Button retains business click', async () => {
  const business = jest.fn();
  await act(async () =>
    root.render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={business}>baseline</Button>
          </TooltipTrigger>
          <TooltipContent>hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  );
  await click('baseline');
  expect(business).toHaveBeenCalledTimes(1);
});

test('forwards both child and wrapper refs and cleans them up on unmount', async () => {
  const childRef = createRef<HTMLButtonElement>();
  const outerRef = createRef<HTMLElement>();
  await act(async () =>
    root.render(
      <BehaviorExposure target="resource_creation_entry" ref={outerRef}>
        <Button ref={childRef}>both refs</Button>
      </BehaviorExposure>
    )
  );
  expect(childRef.current).toBe(byText('both refs'));
  expect(outerRef.current).toBe(childRef.current);
  await act(async () => root.render(null));
  expect(childRef.current).toBeNull();
  expect(outerRef.current).toBeNull();
});

test('preserves React 19 ref cleanup functions for both refs', async () => {
  const childCleanup = jest.fn();
  const outerCleanup = jest.fn();
  const childRef = jest.fn(() => childCleanup);
  const outerRef = jest.fn(() => outerCleanup);
  await act(async () =>
    root.render(
      <BehaviorExposure target="resource_creation_entry" ref={outerRef}>
        <Button ref={childRef}>cleanup</Button>
      </BehaviorExposure>
    )
  );
  expect(childRef).toHaveBeenCalledWith(byText('cleanup'));
  expect(outerRef).toHaveBeenCalledWith(byText('cleanup'));
  await act(async () => root.render(null));
  expect(childCleanup).toHaveBeenCalledTimes(1);
  expect(outerCleanup).toHaveBeenCalledTimes(1);
});

test('keeps a disabled button inert under a real tooltip', async () => {
  const business = jest.fn();
  await act(async () =>
    root.render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {exposure(
              <Button disabled onClick={business}>
                disabled
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  );
  await click('disabled');
  expect(business).not.toHaveBeenCalled();
});

test('keeps child preventDefault visible to the injected handler', async () => {
  const calls: string[] = [];
  await act(async () =>
    root.render(
      <BehaviorExposure
        target="resource_creation_entry"
        onClick={event => {
          if (!event.defaultPrevented) calls.push('injected');
        }}
      >
        <Button
          onClick={event => {
            event.preventDefault();
            calls.push('child');
          }}
        >
          cancel default
        </Button>
      </BehaviorExposure>
    )
  );
  await click('cancel default');
  expect(calls).toEqual(['child']);
});
