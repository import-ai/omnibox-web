import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/request';

const PhoneSchema = z.object({
  phone: z
    .string()
    .min(1, i18next.t('phone.phone_required'))
    .regex(/^1[3-9]\d{9}$/, { message: i18next.t('phone.phone_invalid') }),
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
                    <div className="relative">
                      <Input
                        {...field}
                        disabled={submitting}
                        placeholder={t('phone.enter_phone')}
                        className="h-10 w-full rounded-md border-border pr-10 text-sm font-medium"
                      />
                      {field.value && (
                        <button
                          type="button"
                          onClick={() => form.setValue('phone', '')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-5" />
                        </button>
                      )}
                    </div>
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
}: {
  phone: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      onVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      onVerify(pastedData);
    }
  };

  const handleResend = () => {
    if (canResend) {
      setCountdown(60);
      setCanResend(false);
      onResend();
    }
  };

  // Mask phone number for display (e.g., 138****1234)
  const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

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

        <div className="flex h-14 w-96 items-center justify-center">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleInputChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={submitting}
              className={`h-12 w-12 border border-border bg-background text-center text-2xl font-semibold outline-none focus:border-primary ${
                index === 0
                  ? 'rounded-l-md'
                  : index === 5
                    ? 'rounded-r-md border-l-0'
                    : 'border-l-0'
              }`}
            />
          ))}
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

  const handleSendCode = async (phoneNumber: string) => {
    setSubmitting(true);
    try {
      await http.post('/user/phone/send-code', { phone: phoneNumber });
      setPhone(phoneNumber);
      setStep('code');
      toast.success(t('phone.code_sent'), { position: 'bottom-right' });
    } catch (error: any) {
      toast.error(error.message || t('phone.send_failed'), {
        position: 'bottom-right',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await http.post('/user/phone/send-code', { phone });
      toast.success(t('phone.code_sent'), { position: 'bottom-right' });
    } catch (error: any) {
      toast.error(error.message || t('phone.send_failed'), {
        position: 'bottom-right',
      });
    }
  };

  const handleVerify = async (code: string) => {
    setSubmitting(true);
    try {
      await http.post('/user/phone/bind', { phone, code });
      toast.success(t('phone.bind_success'), { position: 'bottom-right' });
      onFinish();
    } catch (error: any) {
      toast.error(error.message || t('phone.bind_failed'), {
        position: 'bottom-right',
      });
    } finally {
      setSubmitting(false);
    }
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
    />
  );
}
