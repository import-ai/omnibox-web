import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import { CaptchaMount } from '@/components/captcha/CaptchaMount';
import { PhoneNumberInput } from '@/components/phone-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/Form';
import { useCaptcha } from '@/hooks/useCaptcha';
import { usePhoneConfig } from '@/hooks/usePhoneConfig';
import { captchaResultFromError, withCaptchaParam } from '@/lib/captcha';
import { http } from '@/lib/request';
import { buildUrl } from '@/lib/utils';
import { phoneSchema } from '@/lib/validationSchemas';
import { withInviteCode } from '@/page/inviteReferral/authInviteParams';
import { InviteCodeEntry } from '@/page/inviteReferral/InviteCodeEntry';
import { isSupportedEmail } from '@/page/user/login/emailDomains';
import { EmailSuggestionInput } from '@/page/user/login/EmailSuggestionInput';

import type { ContactMethod } from './index';

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'form.email_required')
    .refine(val => isSupportedEmail(val), { message: 'form.email_invalid' }),
});

const phoneFormSchema = z.object({
  phone: phoneSchema,
});

interface IProps {
  children: React.ReactNode;
  contactMethod: ContactMethod;
}

export function RegisterForm({ children, contactMethod }: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emailParam = params.get('email');
  const phoneParam = params.get('phone');
  const redirect = params.get('redirect');
  const [isLoading, setIsLoading] = useState(false);
  const { allowedCountries } = usePhoneConfig();
  const captcha = useCaptcha({ scene: 'web', mode: 'popup' });

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: emailParam || '',
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phone: phoneParam || '',
    },
  });

  useEffect(() => {
    if (emailParam) {
      emailForm.setValue('email', emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    if (phoneParam) {
      phoneForm.setValue('phone', phoneParam);
    }
  }, [phoneParam]);

  const handleEmailSubmit = async (data: z.infer<typeof emailSchema>) => {
    await captcha.run(async captchaVerifyParam => {
      setIsLoading(true);
      try {
        const response = await http.post(
          'auth/send-signup-otp',
          withCaptchaParam(
            {
              email: data.email,
              url: `${window.location.origin}${buildUrl('/user/verify-otp', withInviteCode({ redirect }))}`,
            },
            captchaVerifyParam
          )
        );

        if (response.exists) {
          toast.error(t('register.email_already_exists'), {
            position: 'bottom-right',
          });
          navigate(
            buildUrl(
              '/user/login',
              withInviteCode({
                email: data.email,
                mode: 'email',
                redirect,
              })
            )
          );
          return { captchaResult: true, bizResult: true };
        }

        navigate(
          buildUrl(
            '/user/verify-otp',
            withInviteCode({ email: data.email, redirect })
          )
        );
        return { captchaResult: true, bizResult: true };
      } catch (err) {
        setIsLoading(false);
        return captchaResultFromError(err);
      }
    });
  };

  const handlePhoneSubmit = async (data: z.infer<typeof phoneFormSchema>) => {
    await captcha.run(async captchaVerifyParam => {
      setIsLoading(true);
      try {
        const response = await http.post(
          'auth/send-signup-phone-otp',
          withCaptchaParam({ phone: data.phone }, captchaVerifyParam)
        );

        if (response.exists) {
          toast.error(t('register.phone_already_exists'), {
            position: 'bottom-right',
          });
          navigate(
            buildUrl(
              '/user/login',
              withInviteCode({
                phone: data.phone,
                mode: 'phone',
                redirect,
              })
            )
          );
          return { captchaResult: true, bizResult: true };
        }

        navigate(
          buildUrl(
            '/user/verify-otp',
            withInviteCode({ phone: data.phone, redirect })
          )
        );
        return { captchaResult: true, bizResult: true };
      } catch (err) {
        setIsLoading(false);
        return captchaResultFromError(err);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 pt-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t('register.title')}</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {t('register.description')}
        </p>
      </div>

      {children}
      <CaptchaMount captcha={captcha} />

      {contactMethod === 'email' && (
        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
            className="space-y-4"
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <EmailSuggestionInput
                      className="text-base md:text-sm"
                      disabled={isLoading}
                      placeholder={t('form.email')}
                      name={field.name}
                      value={field.value}
                      onBlur={() => {
                        field.onBlur();
                        void emailForm.trigger('email');
                      }}
                      onChange={value => {
                        field.onChange(value);
                        emailForm.clearErrors('email');
                      }}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <InviteCodeEntry />
            <Button
              type="submit"
              className="w-full disabled:opacity-60"
              loading={isLoading}
            >
              {t('register.submit')}
            </Button>
            <div className="text-center text-sm">
              {t('form.exist_account')}
              <Link
                to={buildUrl(
                  '/user/login',
                  withInviteCode({
                    email: emailForm.getValues('email'),
                    mode: 'email',
                    redirect,
                  })
                )}
                className="text-sm hover:underline underline-offset-2"
              >
                {t('login.submit')}
              </Link>
            </div>
          </form>
        </Form>
      )}

      {contactMethod === 'phone' && (
        <Form {...phoneForm}>
          <form
            onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}
            className="space-y-4"
          >
            <FormField
              control={phoneForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PhoneNumberInput
                      value={field.value as any}
                      onChange={field.onChange}
                      disabled={isLoading}
                      placeholder={t('form.phone')}
                      allowedCountries={allowedCountries}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <InviteCodeEntry />
            <Button
              type="submit"
              className="w-full disabled:opacity-60"
              loading={isLoading}
            >
              {t('register.submit')}
            </Button>
            <div className="text-center text-sm">
              {t('form.exist_account')}
              <Link
                to={buildUrl(
                  '/user/login',
                  withInviteCode({
                    phone: phoneForm.getValues('phone'),
                    mode: 'phone',
                    redirect,
                  })
                )}
                className="text-sm hover:underline underline-offset-2"
              >
                {t('login.submit')}
              </Link>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
