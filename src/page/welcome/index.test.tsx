/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import WelcomePage from './index';

const mockGet = jest.fn();
const mockNavigate = jest.fn();
const mockConfig = { config: { commercial: false }, loading: false };

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@/assets/logo.svg', () => 'logo.svg');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
jest.mock('@/hooks/useConfig', () => ({
  __esModule: true,
  default: () => mockConfig,
}));
jest.mock('@/lib/request', () => ({
  http: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('@/components/ui/Form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormField: () => null,
  FormItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormLabel: () => null,
  FormMessage: () => null,
}));
jest.mock('@/components/ui/Input', () => ({ Input: () => null }));
jest.mock('@/components/button', () => ({ Button: () => null }));
jest.mock('@/page/settings/tabs/account/GenerateForm', () => ({
  __esModule: true,
  default: () => null,
}));

describe('WelcomePage', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    mockConfig.config.commercial = false;
    mockConfig.loading = false;
    localStorage.setItem('uid', 'user-a');
    mockGet.mockReset().mockResolvedValue([{ id: 'space-a' }]);
    mockNavigate.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('redirects to the first existing space after a cross-browser delete race', async () => {
    await act(async () => root.render(<WelcomePage />));
    await act(async () => undefined);
    expect(mockGet).toHaveBeenCalledWith('namespaces');
    expect(mockNavigate).toHaveBeenCalledWith('/space-a/chat', {
      replace: true,
    });
  });

  it('keeps the creation page when the user still has no spaces', async () => {
    mockGet.mockResolvedValue([]);
    await act(async () => root.render(<WelcomePage />));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(container.textContent).toContain('welcome.title');
  });

  it('checks commercial spaces after configuration has loaded', async () => {
    mockConfig.config.commercial = true;
    mockConfig.loading = true;
    await act(async () => root.render(<WelcomePage />));
    expect(mockGet).not.toHaveBeenCalled();

    mockConfig.loading = false;
    await act(async () => root.render(<WelcomePage />));
    expect(mockGet).toHaveBeenCalledWith('pro-namespaces');
    expect(mockNavigate).toHaveBeenCalledWith('/space-a/chat', {
      replace: true,
    });
  });
});
