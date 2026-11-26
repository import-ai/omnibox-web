/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';
import { completeAuthRedirect } from '@/page/inviteReferral/completeAuth';
import { getStoredInviteRegistration } from '@/page/inviteReferral/registration';

import VerifyOtpPage from './VerifyOtpPage';

const navigate = jest.fn();
let params: URLSearchParams;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [params],
}));
jest.mock('@/components/captcha/CaptchaMount', () => ({
  CaptchaMount: () => null,
}));
jest.mock('@/hooks/useCaptcha', () => ({ useCaptcha: () => ({}) }));
jest.mock('@/lib/request', () => ({
  http: { post: jest.fn() },
}));
jest.mock('@/page/inviteReferral/completeAuth', () => ({
  completeAuthRedirect: jest.fn(),
}));
jest.mock('./MetaPage', () => () => null);
jest.mock('./WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('VerifyOtpPage', () => {
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('uid', 'stale-uid');
    root = createRoot(document.createElement('div'));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('verifies an invited signup despite a leftover uid and restores its invite', async () => {
    params = new URLSearchParams('token=signup-link&invite_code=123456');
    const account = {
      id: 'new-user',
      access_token: 'new-token',
      is_new_user: true,
    };
    jest.mocked(http.post).mockResolvedValue(account);

    await act(async () => root.render(<VerifyOtpPage />));

    expect(navigate).not.toHaveBeenCalled();
    expect(getStoredInviteRegistration()).toEqual({
      code: '123456',
      source: 'link',
    });
    expect(completeAuthRedirect).toHaveBeenCalledWith(account, null);
  });

  it('keeps the existing redirect for a verification link without an invite', async () => {
    params = new URLSearchParams('token=signup-link');

    await act(async () => root.render(<VerifyOtpPage />));

    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
    expect(http.post).not.toHaveBeenCalled();
  });
});
