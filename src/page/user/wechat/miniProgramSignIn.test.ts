import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { establishServerSession } from '@/page/user/session';
import { setGlobalCredential } from '@/page/user/util';

import { completeMiniProgramSignIn } from './miniProgramSignIn';

jest.mock('@/page/user/authRedirect', () => ({
  getAuthSuccessRedirect: jest.fn(),
}));
jest.mock('@/page/user/util', () => ({
  setGlobalCredential: jest.fn(),
}));
jest.mock('@/page/user/session', () => ({
  establishServerSession: jest.fn(),
}));

const mockSetGlobalCredential = setGlobalCredential as jest.Mock;
const mockEstablishServerSession = establishServerSession as jest.Mock;
const mockGetAuthSuccessRedirect = getAuthSuccessRedirect as jest.Mock;

describe('completeMiniProgramSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEstablishServerSession.mockResolvedValue(undefined);
    mockGetAuthSuccessRedirect.mockResolvedValue('/ns-1/chat');
  });

  it('establishes the session cookie before resolving the destination', async () => {
    await expect(
      completeMiniProgramSignIn('user-1', 'token-1', '/ns-1/chat')
    ).resolves.toBe('/ns-1/chat');

    expect(mockSetGlobalCredential).toHaveBeenCalledWith('user-1', 'token-1');
    expect(mockEstablishServerSession).toHaveBeenCalled();
    expect(mockGetAuthSuccessRedirect).toHaveBeenCalledWith('/ns-1/chat');
    expect(mockSetGlobalCredential.mock.invocationCallOrder[0]).toBeLessThan(
      mockEstablishServerSession.mock.invocationCallOrder[0]
    );
    expect(mockEstablishServerSession.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetAuthSuccessRedirect.mock.invocationCallOrder[0]
    );
  });

  it('does not resolve a destination when the cookie cannot be set', async () => {
    mockEstablishServerSession.mockRejectedValue(new Error('exchange failed'));

    await expect(
      completeMiniProgramSignIn('user-1', 'token-1', null)
    ).rejects.toThrow('exchange failed');
    expect(mockGetAuthSuccessRedirect).not.toHaveBeenCalled();
  });
});
