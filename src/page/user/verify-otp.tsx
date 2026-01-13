import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { http } from '@/lib/request';
import { buildUrl } from '@/lib/utils';
import { setGlobalCredential } from '@/page/user/util';

import { OtpInput } from './components/otp-input';
import MetaPage from './meta';
import WrapperPage from './wrapper';

export default function VerifyOtpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const email = params.get('email');
  const phone = params.get('phone');
  const redirect = params.get('redirect');
  const magicToken = params.get('token');

  // Determine verification type
  const isPhoneVerification = !!phone && !email;
  const identifier = isPhoneVerification ? phone : email;

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const uid = localStorage.getItem('uid');
    if (uid) {
      navigate('/', { replace: true });
      return;
    }

    // If no email or phone provided, redirect to login
    if (!email && !phone && !magicToken) {
      navigate('/user/login', { replace: true });
      return;
    }

    // Handle magic link
    if (magicToken) {
      verifyMagicLink(magicToken);
    }
  }, [email, phone, magicToken]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const verifyMagicLink = async (token: string) => {
    setIsVerifying(true);
    try {
      const response = await http.post(
        'auth/verify-magic',
        {},
        {
          params: { token },
          data: { lang: localStorage.getItem('i18nextLng') },
        }
      );
      setGlobalCredential(response.id, response.access_token);

      if (redirect) {
        location.href = decodeURIComponent(redirect);
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      setIsVerifying(false);
      // If magic link fails, show the OTP input
      // Global axios interceptor will handle the error toast
    }
  };

  const handleComplete = async (otpCode: string) => {
    if (!identifier) return;

    setIsVerifying(true);
    setError('');

    try {
      let response;

      if (isPhoneVerification) {
        response = await http.post('auth/verify-phone-otp', {
          phone: identifier,
          code: otpCode,
          lang: localStorage.getItem('i18nextLng'),
        });
      } else {
        response = await http.post('auth/verify-otp', {
          email: identifier,
          code: otpCode,
          lang: localStorage.getItem('i18nextLng'),
        });
      }

      setGlobalCredential(response.id, response.access_token);

      if (redirect) {
        location.href = decodeURIComponent(redirect);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setIsVerifying(false);
      setCode('');
      const errorMessage =
        err.response?.data?.message || t('verify_otp.error_invalid_code');
      setError(errorMessage);
      // Global axios interceptor will handle the error toast
    }
  };

  const handleResend = async () => {
    if (!identifier || !canResend || isResending) return;

    setIsResending(true);
    setError('');

    try {
      if (isPhoneVerification) {
        await http.post('auth/send-phone-otp', {
          phone: identifier,
        });
      } else {
        await http.post('auth/send-otp', {
          email: identifier,
          url: `${window.location.origin}${buildUrl('/user/verify-otp', { redirect })}`,
        });
      }

      toast.success(t('verify_otp.resend_success'), {
        position: 'bottom-right',
      });
      setCanResend(false);
      setCountdown(60);
    } catch {
      // Global axios interceptor will handle the error toast
    } finally {
      setIsResending(false);
    }
  };

  // Don't render if magic link is being verified
  if (magicToken && isVerifying) {
    return (
      <WrapperPage extra={<MetaPage />}>
        <div className="flex flex-col items-center justify-center gap-6 pt-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">{t('verify_otp.verifying')}</h1>
            <p className="text-balance text-sm text-muted-foreground">
              {t('verify_otp.verifying_description')}
            </p>
          </div>
        </div>
      </WrapperPage>
    );
  }

  if (!identifier) {
    return null;
  }

  return (
    <WrapperPage extra={<MetaPage />}>
      <div className="flex flex-col items-center gap-6 pt-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{t('verify_otp.title')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t(
              isPhoneVerification
                ? 'verify_otp.description_phone'
                : 'verify_otp.description'
            )}{' '}
            <strong>{identifier}</strong>
          </p>
        </div>

        <div className="w-full max-w-sm">
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={handleComplete}
            error={error}
            disabled={isVerifying}
          />
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="text-sm text-muted-foreground">
            {t('verify_otp.didnt_receive')}{' '}
            <button
              onClick={handleResend}
              disabled={!canResend || isResending}
              className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending
                ? t('verify_otp.resending')
                : canResend
                  ? t('verify_otp.resend')
                  : t('verify_otp.resend_countdown', { seconds: countdown })}
            </button>
          </div>

          <button
            onClick={() => navigate('/user/login')}
            className="text-sm text-muted-foreground hover:underline"
          >
            {t('verify_otp.back_to_login')}
          </button>
        </div>
      </div>
    </WrapperPage>
  );
}
