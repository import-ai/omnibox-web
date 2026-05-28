import { TFunction } from 'i18next';
import { useEffect, useState } from 'react';

/**
 * Hook for managing verification code input state with countdown timer
 */
export function useVerificationCode(error: string, onClearError: () => void) {
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Clear code when error occurs
  useEffect(() => {
    if (error) {
      setCode('');
    }
  }, [error]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleCodeChange = (value: string) => {
    if (error) {
      onClearError();
    }
    setCode(value);
  };

  const handleResend = (onResend: () => void) => {
    if (canResend) {
      setCountdown(60);
      setCanResend(false);
      onResend();
    }
  };

  return {
    code,
    countdown,
    canResend,
    handleCodeChange,
    handleResend,
  };
}

/**
 * Handle OTP verification error and return appropriate error message
 */
export function getOtpErrorMessage(err: any, t: TFunction): string {
  const response = err.response?.data;

  if (response?.remaining !== undefined) {
    if (response.remaining > 0) {
      return t('verify_otp.error_invalid_code_with_attempts', {
        remaining: response.remaining,
      });
    } else {
      return t('verify_otp.error_too_many_attempts');
    }
  } else if (response?.code === 'otp_expired') {
    return t('verify_otp.error_expired_code');
  } else {
    return response?.message || t('verify_otp.error_invalid_code');
  }
}
