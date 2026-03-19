import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import { Input } from '@/components/input';
import { SupportedEmailLink } from '@/components/supported-email-link';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import useUser from '@/hooks/use-user';
import {
  getOtpErrorMessage,
  useVerificationCode,
} from '@/hooks/use-verification-code';
import isEmail from '@/lib/is-email';
import { http } from '@/lib/request';
import { OtpInput } from '@/page/user/components/otp-input';

interface IProps {
  onFinish: (email: string, code: string) => Promise<void>;
}

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'form.email_required')
    .refine(val => isEmail(val), { message: 'form.email_invalid' }),
});

// Step 1: Input new email interface
function EmailInputStep({
  currentEmail,
  onSendCode,
  submitting,
}: {
  currentEmail: string;
  onSendCode: (email: string) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = (data: z.infer<typeof emailSchema>) => {
    onSendCode(data.email);
  };

  return (
    <div className="flex w-full max-w-96 flex-col items-center gap-5">
      <div className="flex w-full flex-col items-center gap-2.5">
        <p className="w-full text-center text-xl lg:text-2xl font-semibold text-foreground">
          {t('email.input_new_email')}
        </p>

        <div className="w-full text-center text-sm font-medium leading-relaxed text-muted-foreground">
          <p>
            <span>{t('email.current_email_is')} </span>
            <span className="font-semibold text-muted-foreground">
              {currentEmail || t('setting.not_bound')}
            </span>
          </p>
          <p>{t('email.will_send_verification')}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        disabled={submitting}
                        placeholder={t('email.enter_new_email')}
                        className="h-10 w-full rounded-md border-border pr-10 text-sm font-medium"
                      />
                      {field.value && (
                        <button
                          type="button"
                          onClick={() => form.setValue('email', '')}
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

            <div className="mt-2.5 w-full text-center text-xs font-medium text-muted-foreground">
              <SupportedEmailLink />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 h-10 w-full rounded-md bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('email.send_verification_code')}
            </button>
          </form>
        </Form>
      </div>
    </div>
  );
}

// Step 2: Verification code interface
function VerificationCodeStep({
  email,
  onVerify,
  onResend,
  submitting,
  error,
  onClearError,
}: {
  email: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  submitting: boolean;
  error: string;
  onClearError: () => void;
}) {
  const { t } = useTranslation();
  const { code, countdown, canResend, handleCodeChange, handleResend } =
    useVerificationCode(error, onClearError);

  return (
    <div className="flex w-full max-w-96 flex-col items-start gap-5">
      <div className="flex w-full flex-col items-start gap-4">
        <div className="flex w-full flex-col items-center gap-2.5">
          <p className="w-full text-center text-xl lg:text-2xl font-semibold text-foreground">
            {t('email.input_verification_code')}
          </p>

          <p className="w-full text-center text-sm font-medium text-muted-foreground">
            {t('email.sent_code_to_account')}
            <span className="font-semibold text-muted-foreground">{email}</span>
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {t('email.sent_verification_code')}
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
              {t('email.not_received')}
            </span>
            {canResend ? (
              <span
                className="cursor-pointer text-foreground hover:underline"
                onClick={() => handleResend(onResend)}
              >
                {' '}
                {t('email.resend')}
              </span>
            ) : (
              <span className="text-foreground">
                {' '}
                {t('email.resend_after_seconds', { seconds: countdown })}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmailValidate(props: IProps) {
  const { onFinish } = props;
  const { t } = useTranslation();
  const { user } = useUser();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async (email: string) => {
    setSubmitting(true);
    try {
      await http.post('/user/email/validate', {
        email,
      });
      setNewEmail(email);
      setStep('code');
      setError('');
      toast.success(t('email.code_sent'), { position: 'bottom-right' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await http.post('/user/email/validate', {
        email: newEmail,
      });
      setError('');
      toast.success(t('email.code_sent'), { position: 'bottom-right' });
    } catch {
      // Error is handled by the request library
    }
  };

  const handleVerify = async (code: string) => {
    setSubmitting(true);
    setError('');
    try {
      // Call onFinish to update user email with the verification code
      await onFinish(newEmail, code);
    } catch (err: any) {
      setSubmitting(false);
      setError(getOtpErrorMessage(err, t));
    }
  };

  const handleClearError = () => {
    setError('');
  };

  if (step === 'email') {
    return (
      <EmailInputStep
        currentEmail={user?.email || ''}
        onSendCode={handleSendCode}
        submitting={submitting}
      />
    );
  }

  return (
    <VerificationCodeStep
      email={newEmail}
      onVerify={handleVerify}
      onResend={handleResendCode}
      submitting={submitting}
      error={error}
      onClearError={handleClearError}
    />
  );
}
