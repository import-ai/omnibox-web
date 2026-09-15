/** @jest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import { useThinkingLevel } from './useThinkingLevel';

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
