/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { UpgradeTrialUsageTooltip } from '.';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { __esModule: true, ...react, default: react };
});

jest.mock('@/components/button', () => ({
  Button: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('UpgradeTrialUsageTooltip', () => {
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
    jest.clearAllMocks();
  });

  it('opens the recovery details when the compact trigger is clicked', async () => {
    await act(async () =>
      root.render(
        <UpgradeTrialUsageTooltip
          textKey="chat.trial.compact_text"
          tooltipItems={['chat.trial.tooltip.recovery']}
          openOnClick
        />
      )
    );

    expect(document.body.textContent).not.toContain(
      'chat.trial.tooltip.recovery'
    );

    await act(async () => {
      container.querySelector('button')?.click();
    });

    expect(document.body.textContent).toContain('chat.trial.tooltip.recovery');
  });
});
