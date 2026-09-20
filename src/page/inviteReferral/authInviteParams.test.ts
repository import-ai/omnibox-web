jest.mock('@/service/inviteReferral', () => ({
  registerInviteReferral: jest.fn(),
}));

import { getInviteCodeForAuthUrl, withInviteCode } from './authInviteParams';
import { setStoredInviteRegistration } from './registration';

const sessionValues = new Map<string, string>();
const sessionStorageMock: Storage = {
  get length() {
    return sessionValues.size;
  },
  clear: () => sessionValues.clear(),
  getItem: key => sessionValues.get(key) ?? null,
  key: index => Array.from(sessionValues.keys())[index] ?? null,
  removeItem: key => sessionValues.delete(key),
  setItem: (key, value) => sessionValues.set(key, value),
};
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
});

describe('auth invite params', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('uses a valid invite code from the url', () => {
    setStoredInviteRegistration({ code: '654321', source: 'manual' });
    expect(getInviteCodeForAuthUrl('?invite_code=123456')).toBe('123456');
  });

  it('falls back to the stored invite code', () => {
    setStoredInviteRegistration({ code: '654321', source: 'link' });
    expect(getInviteCodeForAuthUrl('')).toBe('654321');
  });

  it('ignores invalid codes', () => {
    setStoredInviteRegistration({ code: 'abc', source: 'link' });
    expect(getInviteCodeForAuthUrl('?invite_code=12')).toBe('');
  });

  it('adds invite_code to auth query params', () => {
    expect(
      withInviteCode(
        { email: 'a@b.com', redirect: null },
        '?invite_code=123456'
      )
    ).toEqual({
      email: 'a@b.com',
      redirect: null,
      invite_code: '123456',
    });
  });

  it('leaves params unchanged when there is no invite code', () => {
    expect(withInviteCode({ email: 'a@b.com' }, '')).toEqual({
      email: 'a@b.com',
    });
  });
});
