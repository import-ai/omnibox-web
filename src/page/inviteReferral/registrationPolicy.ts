export function isValidInviteCode(code: string) {
  return /^\d{6}$/.test(code);
}

export function shouldRegisterInvite(isNewUser: boolean, code: string) {
  return isNewUser && isValidInviteCode(code);
}

export function isRetryableInviteRegistrationError(error: unknown) {
  const requestError = error as {
    code?: string | number;
    response?: { status?: number };
  };
  const status = requestError.response?.status;
  return status === undefined
    ? requestError.code === undefined || requestError.code === 'ERR_NETWORK'
    : status >= 500;
}
