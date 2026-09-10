/** @jest-environment jsdom */

import * as React from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import ChatTool from './ChatTool';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip">{children}</span>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: React.forwardRef(function MockButton(
    {
      children,
      className,
      onClick,
      onPointerDown,
      'aria-label': ariaLabel,
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      size?: string;
      variant?: string;
    },
    ref: React.ForwardedRef<HTMLButtonElement>
  ) {
    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={className}
        onClick={onClick}
        onPointerDown={onPointerDown}
      >
        {children}
      </button>
    );
  }),
}));

jest.mock('@/components/ui/DropdownMenu', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => children;
  return {
    DropdownMenu: Passthrough,
    DropdownMenuContent: Passthrough,
    DropdownMenuTrigger: Passthrough,
    DropdownMenuItem: React.forwardRef(function MockMenuItem(
      {
        children,
        className,
        onClick,
        onKeyDown,
        onPointerDown,
        'aria-disabled': ariaDisabled,
      }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        onSelect?: (event: Event) => void;
      },
      ref: React.ForwardedRef<HTMLButtonElement>
    ) {
      return (
        <button
          ref={ref}
          aria-disabled={ariaDisabled}
          className={className}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
        >
          {children}
        </button>
      );
    }),
  };
});

jest.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => children,
  DialogContent: ({ children }: { children: React.ReactNode }) => children,
  DialogDescription: ({ children }: { children: React.ReactNode }) => children,
  DialogHeader: ({ children }: { children: React.ReactNode }) => children,
  DialogTitle: ({ children }: { children: React.ReactNode }) => children,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ChatTool', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  it('disables image selection and explains the Agent 1.1 limitation', async () => {
    const onImageSelect = jest.fn();
    const inputClick = jest
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);

    await act(async () =>
      root.render(
        <ChatTool
          imageUploadDisabled
          onBeforeOpen={jest.fn()}
          onImageSelect={onImageSelect}
          onResourceSelect={jest.fn()}
          onToolToggle={jest.fn()}
          tools={[]}
        />
      )
    );

    const imageMenuItem = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('chat.image.add')
    );
    imageMenuItem?.click();

    expect(imageMenuItem?.getAttribute('aria-disabled')).toBe('true');
    expect(inputClick).not.toHaveBeenCalled();
    expect(
      (container.querySelector('input[type="file"]') as HTMLInputElement)
        .disabled
    ).toBe(true);
    expect(container.textContent).toContain('chat.image.agent_1_1_unsupported');
    expect(onImageSelect).not.toHaveBeenCalled();
  });
});
