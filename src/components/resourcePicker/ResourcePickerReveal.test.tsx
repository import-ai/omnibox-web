/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ResourcePicker } from './ResourcePicker';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

it('reveals the selected row when root loading finishes without changing the tree', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const scrollIntoView = jest.fn();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  const roots = [
    {
      id: 'root',
      name: 'Personal',
      parent_id: null,
      resource_type: 'folder' as const,
    },
  ];
  const loadChildren = jest.fn().mockResolvedValue([]);
  const onSelect = jest.fn();
  const picker = (loading: boolean) => (
    <ResourcePicker
      loading={loading}
      roots={roots}
      selectedResourceId="root"
      loadChildren={loadChildren}
      onSelect={onSelect}
    />
  );

  try {
    await act(async () => root.render(picker(true)));
    expect(scrollIntoView).not.toHaveBeenCalled();

    await act(async () => root.render(picker(false)));
    const selected = container.querySelector('button[aria-pressed="true"]');
    expect(selected?.textContent).toBe('Personal');
    expect(scrollIntoView.mock.contexts).toEqual([selected]);

    await act(async () => root.render(picker(false)));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
