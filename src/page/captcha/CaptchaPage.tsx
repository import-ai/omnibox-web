import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { CaptchaMount } from '@/components/captcha/CaptchaMount';
import { useCaptcha } from '@/hooks/useCaptcha';
import type { CaptchaVerifyResult } from '@/lib/captcha';

const SLIDE_HEIGHT = 40;
const SLIDE_MAX_WIDTH = 360;
const SLIDE_MIN_WIDTH = 320;
const VIEWPORT_GUTTER = 32;

const THEMES = {
  light: { background: '#FFFFFF', color: '#1C1C1E', muted: '#6B7280' },
  dark: { background: '#1C1C1E', color: '#F2F2F7', muted: '#A1A1AA' },
} as const;

type CaptchaMessage =
  | { type: 'captcha'; captchaVerifyParam: string }
  | { type: 'captcha_error'; message: string };

function postToApp(message: CaptchaMessage) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/**
 * Minimal H5 page the mobile app loads in a WebView to run Aliyun captcha
 * with the app scene. Query: `?lang=zh|en&theme=light|dark` (the language is
 * applied by the layout). The verify param is posted to the app as
 * `{ type: 'captcha', captchaVerifyParam }`; failures as
 * `{ type: 'captcha_error', message }`.
 */
export default function CaptchaPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const theme = THEMES[params.get('theme') === 'dark' ? 'dark' : 'light'];
  const [slideStyle] = useState(() => ({
    width: Math.max(
      SLIDE_MIN_WIDTH,
      Math.min(window.innerWidth - VIEWPORT_GUTTER, SLIDE_MAX_WIDTH)
    ),
    height: SLIDE_HEIGHT,
  }));

  const onVerify = useCallback(
    async (captchaVerifyParam?: string): Promise<CaptchaVerifyResult> => {
      if (captchaVerifyParam) {
        postToApp({ type: 'captcha', captchaVerifyParam });
      }
      return { captchaResult: true, bizResult: true };
    },
    []
  );

  const captcha = useCaptcha({
    scene: 'app',
    mode: 'embed',
    slideStyle,
    onVerify,
  });
  const unavailable =
    captcha.status === 'disabled' || captcha.status === 'error';

  useEffect(() => {
    if (unavailable) {
      postToApp({ type: 'captcha_error', message: t('captcha.unavailable') });
    }
  }, [unavailable, t]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: theme.background, color: theme.color }}
    >
      <CaptchaMount
        captcha={captcha}
        style={{
          width: slideStyle.width,
          minHeight: captcha.ready ? slideStyle.height : 0,
        }}
      />
      {captcha.status === 'loading' && (
        <p className="text-sm" style={{ color: theme.muted }}>
          {t('captcha.loading')}
        </p>
      )}
      {unavailable && (
        <p className="text-center text-sm" style={{ color: theme.muted }}>
          {t('captcha.unavailable')}
        </p>
      )}
    </div>
  );
}
