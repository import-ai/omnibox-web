/** @jest-environment jsdom */
import axios from 'axios';
import { act, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import InviteRedirectPage from './index';

const mockNavigate = jest.fn();
const mockParams = {
  namespace_id: 'DfteR9',
  invitation_id: 'DP7NLl',
};

jest.mock('@/components/Button', () => ({
  Button: ({
    children,
    loading,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
  }) => (
    <button {...props} disabled={loading || props.disabled}>
      {children}
    </button>
  ),
}));
jest.mock('@/lib/request', () => ({
  http: { post: jest.fn() },
}));
jest.mock('@/page/user/WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

async function render() {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(<InviteRedirectPage />));
  return {
    container,
    unmount: () => act(async () => root.unmount()),
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

it('does not accept the invitation when the page opens', async () => {
  jest.mocked(http.post).mockResolvedValue({});
  const { container, unmount } = await render();

  expect(http.post).not.toHaveBeenCalled();
  expect(container.querySelector('button')).not.toBeNull();

  await unmount();
});

it('accepts the invitation and opens the namespace chat after confirmation', async () => {
  jest.mocked(http.post).mockResolvedValue({});
  const { container, unmount } = await render();

  await act(async () => {
    container.querySelector('button')!.click();
  });

  expect(http.post).toHaveBeenCalledWith(
    '/namespaces/DfteR9/invitations/DP7NLl/accept',
    undefined,
    expect.objectContaining({ cancelToken: expect.anything() })
  );
  expect(mockNavigate).toHaveBeenCalledWith('/DfteR9/chat', {
    replace: true,
  });

  await unmount();
});

it('keeps the confirmation page available when acceptance fails', async () => {
  jest.mocked(http.post).mockRejectedValue(new Error('expired'));
  const { container, unmount } = await render();

  await act(async () => {
    container.querySelector('button')!.click();
  });

  expect(mockNavigate).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    'invite.accept_failed'
  );
  expect(container.querySelector('button')?.disabled).toBe(false);

  await unmount();
});

it('cancels a pending acceptance request when the page unmounts', async () => {
  jest.mocked(http.post).mockReturnValue(new Promise(() => {}));
  const { container, unmount } = await render();

  await act(async () => {
    container.querySelector('button')!.click();
  });

  const config = jest.mocked(http.post).mock.calls[0][2] as {
    cancelToken?: { reason?: unknown };
  };
  expect(config.cancelToken?.reason).toBeUndefined();

  await unmount();

  expect(axios.isCancel(config.cancelToken?.reason)).toBe(true);
});

it('sends only one acceptance request when the button is clicked repeatedly', async () => {
  jest.mocked(http.post).mockReturnValue(new Promise(() => {}));
  const { container, unmount } = await render();
  const button = container.querySelector('button')!;

  await act(async () => {
    button.click();
    button.click();
  });

  expect(http.post).toHaveBeenCalledTimes(1);
  expect(button.disabled).toBe(true);

  await unmount();
});
