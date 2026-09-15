/** @jest-environment jsdom */

import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ThinkingLevelSelector from './ThinkingLevelSelector';
import type { ThinkingConfig } from './useThinkingLevel';

jest.mock('./thinkingLevelSelector.css', () => ({}));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="model-tooltip">{children}</span>
  ),
}));

jest.mock('@/components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => children,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const config: ThinkingConfig = {
  basic: {
    default: { edition: 'basic', level: 'low' },
    levels: [{ edition: 'basic', level: 'low' }],
  },
  pro: {
    default: { edition: 'pro', level: 'low' },
    levels: [{ edition: 'pro', level: 'low' }],
  },
  default: {
    default: { edition: 'basic', level: 'low' },
    levels: [
      { edition: 'basic', level: 'low' },
      { edition: 'pro', level: 'low' },
    ],
  },
};

async function renderSelector(
  props: Partial<React.ComponentProps<typeof ThinkingLevelSelector>> = {}
) {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <ThinkingLevelSelector
        config={config}
        group="basic"
        onGroupChange={jest.fn()}
        value={{ edition: 'basic', level: 'low' }}
        onChange={jest.fn()}
        {...props}
      />
    )
  );
  await act(async () => {
    container
      .querySelector<HTMLButtonElement>('button[aria-label="chat.model_tier"]')
      ?.click();
  });
  return { container, root };
}

describe('ThinkingLevelSelector', () => {
  it('shows a tooltip for disabled Agent 2.1 when credits are exhausted', async () => {
    const { container, root } = await renderSelector({ proUnsupported: true });
    try {
      const pro = [...container.querySelectorAll('button')].find(button =>
        button.textContent?.includes('chat.model.pro')
      );
      expect(pro?.disabled).toBe(true);
      expect(
        container.querySelector('[data-testid="model-tooltip"]')?.textContent
      ).toBe('chat.agent_credits.compact_tooltip');
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('hides the Agent 2.1 tooltip when Pro is available', async () => {
    const { container, root } = await renderSelector();
    try {
      const pro = [...container.querySelectorAll('button')].find(button =>
        button.textContent?.includes('chat.model.pro')
      );
      expect(pro?.disabled).toBe(false);
      expect(
        container.querySelector('[data-testid="model-tooltip"]')
      ).toBeNull();
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('disables Agent 1.1 with a tooltip when the composer has images', async () => {
    const { container, root } = await renderSelector({
      group: 'pro',
      value: { edition: 'pro', level: 'low' },
      basicUnsupported: true,
    });
    try {
      const basic = [...container.querySelectorAll('button')].find(button =>
        button.textContent?.includes('chat.model.basic')
      );
      expect(basic?.disabled).toBe(true);
      expect(
        container.querySelector('[data-testid="model-tooltip"]')?.textContent
      ).toBe('chat.image.agent_1_1_unsupported');
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('hides Agent 1.1 steps from the default slider when the composer has images', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <ThinkingLevelSelector
          config={config}
          group="default"
          onGroupChange={jest.fn()}
          value={{ edition: 'pro', level: 'low' }}
          onChange={jest.fn()}
          basicUnsupported
        />
      )
    );
    try {
      const slider = container.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement;
      expect(slider.max).toBe('0');
    } finally {
      await act(async () => root.unmount());
    }
  });
});
