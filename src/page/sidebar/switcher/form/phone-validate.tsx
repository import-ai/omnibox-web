import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import { PhoneNumberInput } from '@/components/phone-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { usePhoneConfig } from '@/hooks/use-phone-config';
import { http } from '@/lib/request';
import { OtpInput } from '@/page/user/components/otp-input';

const PhoneSchema = z.object({
  phone: z
    .string()
    .min(1, i18next.t('phone.phone_required'))
    .refine(val => isValidPhoneNumber(val || ''), {
      message: i18next.t('phone.phone_invalid'),
    }),
});

type PhoneFormValues = z.infer<typeof PhoneSchema>;

interface IProps {
  onFinish: () => void;
  currentPhone?: string;
}

// Step 1: Input phone number interface
function PhoneInputStep({
  currentPhone,
  onSendCode,
  submitting,
}: {
  currentPhone?: string;
  onSendCode: (phone: string) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const { allowedCountries } = usePhoneConfig();
  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(PhoneSchema),
    defaultValues: { phone: '' },
  });

  const handleSubmit = (data: PhoneFormValues) => {
    onSendCode(data.phone);
  };

  return (
    <div className="flex w-96 flex-col items-center gap-5">
      <div className="flex w-full flex-col items-center gap-2.5">
        <p className="w-full text-center text-2xl font-semibold text-foreground">
          {t('phone.input_phone')}
        </p>

        <div className="w-full text-center text-sm font-medium leading-relaxed text-muted-foreground">
          {currentPhone ? (
            <p>
              <span>{t('phone.current_phone_is')} </span>
              <span className="font-semibold text-muted-foreground">
                {currentPhone}
              </span>
            </p>
          ) : null}
          <p>{t('phone.will_send_verification')}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PhoneNumberInput
                      value={field.value as any}
                      onChange={field.onChange}
                      disabled={submitting}
                      placeholder={t('phone.enter_phone')}
                      allowedCountries={allowedCountries}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 h-10 w-full rounded-md bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('phone.send_verification_code')}
            </button>
          </form>
        </Form>
      </div>
    </div>
  );
}

// Step 2: Verification code interface
function VerificationCodeStep({
  phone,
  onVerify,
  onResend,
  submitting,
  error,
  onClearError,
}: {
  phone: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  submitting: boolean;
  error: string;
  onClearError: () => void;
}) {
  const { t } = useTranslation();
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

  const handleResend = () => {
    if (canResend) {
      setCountdown(60);
      setCanResend(false);
      onResend();
    }
  };

  // Mask phone number for display (e.g., +86 138****1234)
  const getMaskedPhone = () => {
    try {
      const parsed = parsePhoneNumber(phone);
      if (parsed) {
        const national = parsed.nationalNumber;
        const masked = national.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        return `+${parsed.countryCallingCode} ${masked}`;
      }
    } catch {
      // fallback
    }
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };
  const maskedPhone = getMaskedPhone();

  return (
    <div className="flex w-96 flex-col items-start gap-5">
      <div className="flex w-full flex-col items-start gap-4">
        <div className="flex w-full flex-col items-center gap-2.5">
          <p className="w-full text-center text-2xl font-semibold text-foreground">
            {t('phone.input_verification_code')}
          </p>

          <p className="w-full text-center text-sm font-medium text-muted-foreground">
            {t('phone.sent_code_to')}
            <span className="font-semibold text-muted-foreground">
              {maskedPhone}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 w-full">
          <OtpInput
            value={code}
            onChange={handleCodeChange}
            onComplete={onVerify}
            error={error}
            disabled={submitting}
          />
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-2.5">
          <p className="text-sm font-medium">
            <span className="text-muted-foreground">
              {t('phone.not_received')}
            </span>
            {canResend ? (
              <span
                className="cursor-pointer text-foreground hover:underline"
                onClick={handleResend}
              >
                {' '}
                {t('phone.resend')}
              </span>
            ) : (
              <span className="text-foreground">
                {' '}
                {t('phone.resend_after_seconds', { seconds: countdown })}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PhoneValidate(props: IProps) {
  const { onFinish, currentPhone } = props;
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async (phoneNumber: string) => {
    setSubmitting(true);
    try {
      await http.post('/user/phone/send-code', { phone: phoneNumber });
      setPhone(phoneNumber);
      setStep('code');
      setError('');
      toast.success(t('phone.code_sent'), { position: 'bottom-right' });
    } catch {
      // Error toast is handled automatically by http client
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await http.post('/user/phone/send-code', { phone });
      setError('');
      toast.success(t('phone.code_sent'), { position: 'bottom-right' });
    } catch {
      // Error toast is handled automatically by http client
    }
  };

  const handleVerify = async (code: string) => {
    setSubmitting(true);
    setError('');
    try {
      // Use mute: true since we handle errors in UI via setError
      await http.post('/user/phone/bind', { phone, code }, { mute: true });
      toast.success(t('phone.bind_success'), { position: 'bottom-right' });
      onFinish();
    } catch (err: any) {
      setSubmitting(false);
      const response = err.response?.data;
      // Handle error with remaining attempts
      if (response?.remaining !== undefined) {
        if (response.remaining > 0) {
          setError(
            t('verify_otp.error_invalid_code_with_attempts', {
              remaining: response.remaining,
            })
          );
        } else {
          setError(t('verify_otp.error_too_many_attempts'));
        }
      } else if (response?.code === 'otp_expired') {
        setError(t('verify_otp.error_expired_code'));
      } else {
        setError(response?.message || t('verify_otp.error_invalid_code'));
      }
    }
  };

  const handleClearError = () => {
    setError('');
  };

  if (step === 'phone') {
    return (
      <PhoneInputStep
        currentPhone={currentPhone}
        onSendCode={handleSendCode}
        submitting={submitting}
      />
    );
  }

  return (
    <VerificationCodeStep
      phone={phone}
      onVerify={handleVerify}
      onResend={handleResendCode}
      submitting={submitting}
      error={error}
      onClearError={handleClearError}
    />
  );
}
