import { zodResolver } from '@hookform/resolvers/zod';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import bindPhoneBubbleLight from '@/assets/inviteReferral/bindPhoneBubble.svg';
import bindPhoneBubbleDark from '@/assets/inviteReferral/bindPhoneBubbleDark.svg';
import bindPhoneCatDark from '@/assets/inviteReferral/bindPhoneCatDark.svg';
import bindPhoneCatLight from '@/assets/inviteReferral/bindPhoneCatLight.svg';
import logoSvg from '@/assets/logo.svg';
import { Button } from '@/components/button';
import { PhoneNumberInput } from '@/components/phone-input';
import { formatPhone } from '@/components/phone-input/utils';
import { LanguageToggle } from '@/components/toggle/LanguageToggle';
import { ThemeToggle } from '@/components/toggle/ThemeToggle';
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/Form';
import { usePhoneConfig } from '@/hooks/usePhoneConfig';
import useTheme from '@/hooks/useTheme';
import { getOtpErrorMessage } from '@/hooks/useVerificationCode';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';
import { phoneSchema } from '@/lib/validationSchemas';
import { OtpInput } from '@/page/user/components/OtpInput';

const PhoneSchema = z.object({
  phone: phoneSchema,
});

type PhoneFormValues = z.infer<typeof PhoneSchema>;

interface InvitePhoneBindingDialogProps {
  onBound?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function InvitePhoneBindingDialog({
  onBound,
  onOpenChange,
  open,
}: InvitePhoneBindingDialogProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme.content === 'dark';
  const { allowedCountries } = usePhoneConfig();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(PhoneSchema),
    defaultValues: { phone: '' },
  });
  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    setStep('phone');
    setPhone('');
    setCode('');
    setError('');
    setSubmitting(false);
    reset({ phone: '' });
  }, [open, reset]);

  useEffect(() => {
    if (!open || step !== 'code' || countdown <= 0) {
      return;
    }
    const timer = window.setTimeout(
      () => setCountdown(value => value - 1),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [open, step, countdown]);

  useEffect(() => {
    if (step === 'code' && countdown <= 0) {
      setCanResend(true);
    }
  }, [countdown, step]);

  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
  };

  const skip = () => onOpenChange(false);

  const handleSendCode = async (phoneNumber: string) => {
    setSubmitting(true);
    try {
      await http.post('/user/phone/send-code', { phone: phoneNumber });
      setPhone(phoneNumber);
      setStep('code');
      setCode('');
      setError('');
      startCountdown();
      toast.success(t('phone.code_sent'), { position: 'bottom-right' });
    } catch {
      // Error toast is handled automatically by http client
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    try {
      await http.post('/user/phone/send-code', { phone });
      setError('');
      startCountdown();
      toast.success(t('phone.code_sent'), { position: 'bottom-right' });
    } catch {
      // Error toast is handled automatically by http client
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    setError('');
    try {
      await http.post('/user/phone/bind', { phone, code }, { mute: true });
      toast.success(t('phone.bind_success'), { position: 'bottom-right' });
      await onBound?.();
      onOpenChange(false);
    } catch (err) {
      setError(getOtpErrorMessage(err, t));
      setSubmitting(false);
    }
  };

  const canBind = code.length === 6 && !submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (nextOpen) onOpenChange(true);
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex h-full w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 bg-background p-4 shadow-none outline-none"
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          onPointerDownOutside={event => event.preventDefault()}
          onInteractOutside={event => event.preventDefault()}
          onEscapeKeyDown={event => event.preventDefault()}
        >
          <DialogTitle className="sr-only">
            {t('inviteReferral.phoneBinding.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('inviteReferral.phoneBinding.bubble')}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="relative">
              <div className="absolute bottom-full left-1/2 mb-[148px] flex -translate-x-1/2 items-center gap-2 font-medium text-black dark:text-white">
                <div className="flex items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <img src={logoSvg} alt="" className="size-6" />
                </div>
                {t('login.product_name')}
              </div>
              <div
                className={cn(
                  'relative w-[510px] max-w-[calc(100vw-32px)] overflow-visible rounded-[18px] bg-white shadow-[0px_10px_28px_rgba(0,0,0,0.16)] dark:bg-[#171717]',
                  step === 'phone' ? 'min-h-[316px]' : 'min-h-[309px]'
                )}
              >
                <button
                  type="button"
                  className="absolute right-[18px] top-[15px] z-30 text-[14px] font-normal leading-[23px] text-muted-foreground hover:text-foreground"
                  onClick={skip}
                >
                  {t('inviteReferral.phoneBinding.skip')}
                </button>
                {step === 'phone' ? (
                  <>
                    <img
                      src={isDark ? bindPhoneCatDark : bindPhoneCatLight}
                      alt=""
                      width={isDark ? 95 : 89}
                      height={isDark ? 99 : 93}
                      className={cn(
                        'pointer-events-none absolute z-0 object-contain',
                        isDark
                          ? 'left-[97px] top-[74px] h-[99px] w-[95px]'
                          : 'left-[100px] top-[77px] h-[93px] w-[89px]'
                      )}
                    />
                    <div className="pointer-events-none absolute left-[208px] top-[53px] z-20 h-[71px] w-[215px]">
                      <img
                        src={
                          isDark ? bindPhoneBubbleDark : bindPhoneBubbleLight
                        }
                        alt=""
                        width={207}
                        height={71}
                      />
                      <p className="absolute left-[41px] top-[17px] w-[146px] text-[14px] font-medium leading-[18px] text-muted-foreground dark:text-[hsl(0_0%_98%)]">
                        {t('inviteReferral.phoneBinding.bubble')}
                      </p>
                    </div>
                    <Form {...form}>
                      <form
                        className="relative z-10 ml-[88px] w-[335px] pb-5 pt-[146px]"
                        onSubmit={form.handleSubmit(
                          values => void handleSendCode(values.phone)
                        )}
                      >
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <PhoneNumberInput
                                  value={field.value as never}
                                  onChange={field.onChange}
                                  disabled={submitting}
                                  placeholder={t('phone.enter_phone')}
                                  allowedCountries={allowedCountries}
                                  variant="bind"
                                  className="h-[52px] rounded-lg border-[#E5E5E5] bg-white opacity-100 focus-within:ring-0 disabled:opacity-100 dark:border-[#303030] dark:bg-[#171717] [&_input]:disabled:opacity-100"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="mt-5 h-[49px] w-full rounded-lg bg-[#0A0A0A] text-[14px] font-medium"
                          loading={submitting}
                        >
                          {t('phone.send_verification_code')}
                        </Button>
                        <p className="mt-2.5 text-center text-[10px] leading-[18px] text-muted-foreground">
                          {t('phone.will_send_verification')}
                        </p>
                      </form>
                    </Form>
                  </>
                ) : (
                  <div className="flex min-h-[309px] w-full flex-col pb-5 pt-6">
                    <h2 className="pl-7 pr-20 text-[18px] font-bold leading-normal text-foreground">
                      {t('phone.input_verification_code')}
                    </h2>
                    <div className="mx-auto flex w-full max-w-[335px] flex-col px-4 sm:px-0">
                      <p className="mt-8 text-center text-[15px] font-normal leading-[23px] text-[#737373]">
                        {t('phone.sent_code_to')}
                        <span className="font-bold">{formatPhone(phone)}</span>
                      </p>
                      <div className="mt-4 flex min-h-[56px] items-center justify-center">
                        <OtpInput
                          value={code}
                          disabled={submitting}
                          error={error}
                          errorAlign="center"
                          onChange={value => {
                            setCode(value);
                            if (error) setError('');
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        className="mt-[30px] h-[49px] w-full rounded-lg bg-[#0A0A0A] text-[15px] font-medium leading-[23px] disabled:bg-[#737373] disabled:text-white dark:disabled:bg-[#737373] dark:disabled:text-white"
                        loading={submitting}
                        disabled={!canBind}
                        onClick={() => void handleVerify()}
                      >
                        {t('inviteReferral.phoneBinding.submit')}
                      </Button>
                      <p className="mt-2.5 text-center text-[12px] font-normal leading-[18px]">
                        <span className="text-muted-foreground">
                          {t('phone.not_received')}
                        </span>
                        {canResend ? (
                          <button
                            type="button"
                            className="font-medium text-foreground hover:underline"
                            onClick={() => void handleResendCode()}
                          >
                            {t('phone.resend')}
                          </button>
                        ) : (
                          <span className="font-medium text-foreground">
                            {t('phone.resend_after_seconds', {
                              seconds: countdown,
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
