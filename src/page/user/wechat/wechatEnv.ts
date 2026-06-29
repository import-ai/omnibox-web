export function isMiniProgramWebView(userAgent = navigator.userAgent): boolean {
  if (typeof window !== 'undefined') {
    const wxEnv = (window as Window & { __wxjs_environment?: string })
      .__wxjs_environment;
    if (wxEnv === 'miniprogram') {
      return true;
    }
  }

  return /miniprogram/i.test(userAgent);
}

export function collectWechatEnvDebugInfo(context: {
  from: string | null;
  hasMpCode: boolean;
  mpCodeLength: number;
}): Record<string, string> {
  const wxEnv =
    typeof window !== 'undefined'
      ? (window as Window & { __wxjs_environment?: string })
          .__wxjs_environment || '(unset)'
      : '(no window)';

  return {
    href: typeof window !== 'undefined' ? window.location.href : '',
    from: context.from || '(none)',
    mp_code: context.hasMpCode ? `yes (${context.mpCodeLength})` : 'no',
    wx_env: wxEnv,
    mp_webview: isMiniProgramWebView() ? 'yes' : 'no',
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}
