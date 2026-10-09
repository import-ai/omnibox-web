import type { CSSProperties } from 'react';

import type { CaptchaController } from '@/hooks/useCaptcha';

interface CaptchaMountProps {
  captcha: Pick<CaptchaController, 'mountId' | 'mode'>;
  className?: string;
  style?: CSSProperties;
}

/**
 * Empty wrapper the captcha hook fills with the SDK's `#element` container and
 * (in popup mode) the hidden trigger button. React never renders children into
 * it, so the hook can rebuild those nodes for every verification round.
 * In popup mode the wrapper takes no layout space (the SDK renders its dialog
 * on <body>); embed mode sizes it to the inline widget via className/style.
 */
export function CaptchaMount({ captcha, className, style }: CaptchaMountProps) {
  const defaultClassName =
    captcha.mode === 'popup' ? 'absolute size-0 overflow-visible' : undefined;
  return (
    <div
      id={captcha.mountId}
      className={className ?? defaultClassName}
      style={style}
    />
  );
}
