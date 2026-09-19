/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { AuthConfigProvider, useAuthConfig } from './AuthConfigContext';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn().mockResolvedValue({ available: true }) },
}));

function Methods() {
  const { config } = useAuthConfig();
  return <span>{JSON.stringify(config)}</span>;
}

it('restricts host providers even when all server providers are available', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <AuthConfigProvider supportedProviders={[]}>
        <Methods />
      </AuthConfigProvider>
    )
  );
  expect(JSON.parse(container.textContent!)).toEqual({
    wechat: false,
    google: false,
    apple: false,
  });
  await act(async () =>
    root.render(
      <AuthConfigProvider>
        <Methods />
      </AuthConfigProvider>
    )
  );
  expect(JSON.parse(container.textContent!)).toEqual({
    wechat: true,
    google: true,
    apple: true,
  });
  await act(async () => root.unmount());
});
