/** @jest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

import { availableThinkingStep, useThinkingLevel } from './useThinkingLevel';

jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('selects five Default steps, switches 3/2 groups and restores the selection', async () => {
  const basic = ['low', 'high'].map(level => ({ edition: 'basic', level }));
  const pro = ['low', 'high', 'max'].map(level => ({ edition: 'pro', level }));
  const levels = [...basic, ...pro];
  (http.get as jest.Mock).mockResolvedValue({
    basic: { default: basic[0], levels: basic },
    pro: { default: pro[0], levels: pro },
    default: { default: basic[0], levels },
  });
  localStorage.clear();
  let result!: ReturnType<typeof useThinkingLevel>;
  function Harness() {
    result = useThinkingLevel('/full', []);
    return null;
  }
  const container = document.createElement('div');
  let root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(Harness)));
    expect(result.group).toBe('default');
    expect(result.config?.[result.group]?.levels).toHaveLength(5);
    for (const selection of levels) {
      await act(async () =>
        result.changeLevel(`${selection.edition}.${selection.level}`)
      );
      expect(result.selection).toEqual(selection);
    }
    await act(async () => result.changeGroup('pro'));
    expect(result.config?.[result.group]?.levels).toHaveLength(3);
    expect(result.selection).toEqual(pro[0]);
    await act(async () => result.changeLevel('basic.high'));
    expect(result.selection).toEqual(pro[0]);
    await act(async () => result.changeGroup('basic'));
    expect(result.config?.[result.group]?.levels).toHaveLength(2);
    await act(async () => result.changeLevel('basic.high'));
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(React.createElement(Harness)));
    expect(result.group).toBe('basic');
    expect(result.selection).toEqual(basic[1]);
    await act(async () => root.unmount());
    localStorage.setItem(
      'thinking-level:/full',
      '{"group":"__proto__","step":"basic.high"}'
    );
    root = createRoot(container);
    await act(async () => root.render(React.createElement(Harness)));
    expect(result.group).toBe('default');
    expect(result.selection).toEqual(basic[1]);
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
  }
});

it('selects an explicit step when changing groups', async () => {
  const basic = ['low', 'high'].map(level => ({
    edition: 'basic' as const,
    level,
  }));
  const pro = ['low', 'high'].map(level => ({
    edition: 'pro' as const,
    level,
  }));
  (http.get as jest.Mock).mockResolvedValue({
    basic: { default: basic[0], levels: basic },
    pro: { default: pro[0], levels: pro },
    default: { default: pro[0], levels: [...basic, ...pro] },
  });
  localStorage.clear();
  let result!: ReturnType<typeof useThinkingLevel>;
  function Harness() {
    result = useThinkingLevel('/full', []);
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => result.changeGroup('default', 'basic.high'));
    expect(result.group).toBe('default');
    expect(result.selection).toEqual(basic[1]);
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
  }
});

it('prefers the group default when it is still available', () => {
  const options = {
    default: { edition: 'pro' as const, level: 'low' },
    levels: [
      { edition: 'basic' as const, level: 'low' },
      { edition: 'pro' as const, level: 'low' },
    ],
  };
  expect(availableThinkingStep(options)).toBe('pro.low');
  expect(availableThinkingStep(options, { pro: true })).toBe('basic.low');
  expect(availableThinkingStep(options, { pro: true, basic: true })).toBe(
    undefined
  );
});

it('re-reads a share catalog as turns settle and locks Pro when the space runs dry', async () => {
  const basic = [{ edition: 'basic' as const, level: 'low' }];
  const pro = [{ edition: 'pro' as const, level: 'max' }];
  const catalog = (proAvailable: boolean) => ({
    basic: { default: basic[0], levels: basic },
    pro: { default: pro[0], levels: pro },
    default: { default: pro[0], levels: [...basic, ...pro] },
    edition: 'pro',
    pro_available: proAvailable,
  });
  const turn = (status: MessageStatus): MessageDetail =>
    ({
      id: 'assistant',
      message: { role: OpenAIMessageRole.ASSISTANT, content: 'Hi' },
      status,
    }) as MessageDetail;
  localStorage.clear();
  (http.get as jest.Mock).mockReset();
  (http.get as jest.Mock).mockResolvedValue(catalog(true));
  let result!: ReturnType<typeof useThinkingLevel>;
  function Harness({ messages }: { messages: MessageDetail[] }) {
    result = useThinkingLevel('/s/share', messages);
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        React.createElement(Harness, {
          messages: [turn(MessageStatus.PENDING)],
        })
      )
    );
    expect(http.get).toHaveBeenCalledWith('/config/models?share_id=share', {
      mute: true,
    });
    // Still streaming: the balance it will spend is not final, so nothing is
    // re-read and Agent 2.1 stays on offer.
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(result.proLocked).toBe(false);

    (http.get as jest.Mock).mockResolvedValue(catalog(false));
    await act(async () =>
      root.render(
        React.createElement(Harness, {
          messages: [turn(MessageStatus.SUCCESS)],
        })
      )
    );
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(result.proLocked).toBe(true);
    expect(result.config?.pro).toBeDefined();
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
  }
});
