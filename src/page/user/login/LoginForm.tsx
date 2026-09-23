import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/button';
import { CaptchaMount } from '@/components/captcha/CaptchaMount';
import { Input } from '@/components/input';
import { PhoneNumberInput } from '@/components/phone-input';
import Space from '@/components/space';
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
import { buildUrl, cn } from '@/lib/utils';
import { passwordSchema, phoneSchema } from '@/lib/validationSchemas';
import { withInviteCode } from '@/page/inviteReferral/authInviteParams';
import { completeAuthRedirect } from '@/page/inviteReferral/completeAuth';
import { InviteCodeEntry } from '@/page/inviteReferral/InviteCodeEntry';

import { isSupportedEmail } from './emailDomains';
import { EmailSuggestionInput } from './EmailSuggestionInput';
import type { AuthMethod, ContactMethod } from './index';

const emailFormSchema = z.object({
  email: z
    .string()
    .min(1, 'form.email_required')
    .refine(val => isSupportedEmail(val), {
      message: 'form.email_invalid',
    }),
});

const emailPasswordFormSchema = z.object({
  email: z
    .string()
    .min(1, 'form.email_or_username_invalid')
    .refine(val => !val.includes('@') || isSupportedEmail(val), {
      message: 'form.email_or_username_invalid',
    }),
  password: passwordSchema,
});

const phoneFormSchema = z.object({
  phone: phoneSchema,
});

const phonePasswordFormSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

interface IProps extends React.ComponentPropsWithoutRef<'form'> {
  children: React.ReactNode;
  contactMethod: ContactMethod;
  authMethod: AuthMethod;
  setAuthMethod: (method: AuthMethod) => void;
}

export function LoginForm({
  className,
  children,
  contactMethod,
  authMethod,
  setAuthMethod,
  ...props
}: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const emailParam = params.get('email');
  const phoneParam = params.get('phone');
  const [isLoading, setIsLoading] = useState(false);
  const { allowedCountries } = usePhoneConfig();
  const captcha = useCaptcha({ scene: 'web', mode: 'popup' });
  const linkClass =
    'text-sm hover:underline dark:text-[#60a5fa] text-[#107bfa] underline-offset-2';

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: emailParam || '',
    },
  });

  const emailPasswordForm = useForm<z.infer<typeof emailPasswordFormSchema>>({
    resolver: zodResolver(emailPasswordFormSchema),
    defaultValues: {
      email: emailParam || '',
      password: '',
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phone: phoneParam || '',
    },
  });

  const phonePasswordForm = useForm<z.infer<typeof phonePasswordFormSchema>>({
    resolver: zodResolver(phonePasswordFormSchema),
    defaultValues: {
      phone: phoneParam || '',
      password: '',
    },
  });

  const finishLogin = async (response: {
    id: string;
    access_token: string;
    is_new_user?: boolean;
  }) => {
    await completeAuthRedirect(response, redirect);
  };

  const onEmailSubmit = async (data: z.infer<typeof emailFormSchema>) => {
    await captcha.run(async captchaVerifyParam => {
      setIsLoading(true);
      try {
        const response = await http.post(
          'auth/send-otp',
          withCaptchaParam(
            {
              email: data.email,
              url: `${window.location.origin}${buildUrl('/user/verify-otp', withInviteCode({ redirect }))}`,
            },
            captchaVerifyParam
          )
        );

        if (!response.exists) {
          toast.error(t('login.email_not_exists'), {
            position: 'bottom-right',
          });
          navigate(
            buildUrl(
              '/user/sign-up',
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

  const onEmailPasswordSubmit = (
    data: z.infer<typeof emailPasswordFormSchema>
  ) => {
    setIsLoading(true);
    http
      .post('login', {
        username: data.email,
        password: data.password,
        type: 'email',
      })
      .then(async response => {
        await finishLogin(response);
      })
      .catch(err => {
        setIsLoading(false);
        if (err.response?.data?.code === 'user_not_found') {
          navigate(
            buildUrl(
              '/user/sign-up',
              withInviteCode({
                email: data.email,
                mode: 'email',
                redirect,
              })
            )
          );
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const onPhoneSubmit = async (data: z.infer<typeof phoneFormSchema>) => {
    await captcha.run(async captchaVerifyParam => {
      setIsLoading(true);
      try {
        const response = await http.post(
          'auth/send-phone-otp',
          withCaptchaParam({ phone: data.phone }, captchaVerifyParam)
        );

        if (!response.exists) {
          toast.error(t('login.phone_not_exists'), {
            position: 'bottom-right',
          });
          navigate(
            buildUrl(
              '/user/sign-up',
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

  const onPhonePasswordSubmit = (
    data: z.infer<typeof phonePasswordFormSchema>
  ) => {
    setIsLoading(true);
    http
      .post('login', {
        username: data.phone,
        password: data.password,
        type: 'phone',
      })
      .then(async response => {
        await finishLogin(response);
      })
      .catch(err => {
        setIsLoading(false);
        if (err.response?.data?.code === 'user_not_found') {
          navigate(
            buildUrl(
              '/user/sign-up',
              withInviteCode({
                phone: data.phone,
                mode: 'phone',
                redirect,
              })
            )
          );
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('from') === 'extension_login') {
      localStorage.setItem('extension_login', 'true');
    }
  }, []);

  const renderLinks = () => {
    if (contactMethod === 'email' && authMethod === 'otp') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              emailPasswordForm.setValue('email', emailForm.getValues('email'));
              setAuthMethod('password');
            }}
            className={linkClass}
          >
            {t('login.use_password')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl(
              '/user/sign-up',
              withInviteCode({
                email: emailForm.getValues('email'),
                mode: 'email',
                redirect,
              })
            )}
            className={linkClass}
          >
            {t('login.sign_up')}
          </Link>
        </Space>
      );
    }

    if (contactMethod === 'email' && authMethod === 'password') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              emailForm.setValue('email', emailPasswordForm.getValues('email'));
              setAuthMethod('otp');
            }}
            className={linkClass}
          >
            {t('login.use_otp')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl(
              '/user/sign-up',
              withInviteCode({
                email: emailPasswordForm.getValues('email'),
                mode: 'email',
                redirect,
              })
            )}
            className={linkClass}
          >
            {t('login.sign_up')}
          </Link>
        </Space>
      );
    }

    if (contactMethod === 'phone' && authMethod === 'otp') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              phonePasswordForm.setValue('phone', phoneForm.getValues('phone'));
              setAuthMethod('password');
            }}
            className={linkClass}
          >
            {t('login.use_password')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl(
              '/user/sign-up',
              withInviteCode({
                phone: phoneForm.getValues('phone'),
                mode: 'phone',
                redirect,
              })
            )}
            className={linkClass}
          >
            {t('login.sign_up')}
          </Link>
        </Space>
      );
    }

    if (contactMethod === 'phone' && authMethod === 'password') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              phoneForm.setValue('phone', phonePasswordForm.getValues('phone'));
              setAuthMethod('otp');
            }}
            className={linkClass}
          >
            {t('login.use_otp')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl(
              '/user/sign-up',
              withInviteCode({
                phone: phonePasswordForm.getValues('phone'),
                mode: 'phone',
                redirect,
              })
            )}
            className={linkClass}
          >
            {t('login.sign_up')}
          </Link>
        </Space>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-6 pt-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t('login.title')}</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {t('login.description')}
        </p>
      </div>

      {children}
      <CaptchaMount captcha={captcha} />

      {contactMethod === 'email' && authMethod === 'otp' && (
        <Form {...emailForm} key="email-form">
          <form
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
            className={cn('flex flex-col gap-4', className)}
            {...props}
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <EmailSuggestionInput
                      disabled={isLoading}
                      placeholder={t('form.email')}
                      className="text-base md:text-sm"
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
              variant="default"
              className="w-full disabled:opacity-60"
              loading={isLoading}
              disabled={isLoading || captcha.running}
            >
              {t('login.continue')}
            </Button>
            {renderLinks()}
          </form>
        </Form>
      )}

      {contactMethod === 'email' && authMethod === 'password' && (
        <Form {...emailPasswordForm} key="email-password-form">
          <form
            onSubmit={emailPasswordForm.handleSubmit(onEmailPasswordSubmit)}
            className={cn('flex flex-col gap-4', className)}
            {...props}
          >
            <FormField
              control={emailPasswordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <EmailSuggestionInput
                      disabled={isLoading}
                      placeholder={t('form.email_or_username')}
                      className="text-base md:text-sm"
                      name={field.name}
                      value={field.value}
                      onBlur={() => {
                        field.onBlur();
                        void emailPasswordForm.trigger('email');
                      }}
                      onChange={value => {
                        field.onChange(value);
                        emailPasswordForm.clearErrors('email');
                      }}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={emailPasswordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      startIcon={Lock}
                      disabled={isLoading}
                      placeholder={t('form.password')}
                      className="text-base md:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <InviteCodeEntry />
            <Button
              type="submit"
              variant="default"
              className="w-full disabled:opacity-60"
              loading={isLoading}
            >
              {t('login.submit')}
            </Button>
            {renderLinks()}
          </form>
        </Form>
      )}

      {contactMethod === 'phone' && authMethod === 'otp' && (
        <Form {...phoneForm} key="phone-form">
          <form
            onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
            className={cn('flex flex-col gap-4', className)}
            {...props}
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
              variant="default"
              className="w-full disabled:opacity-60"
              loading={isLoading}
              disabled={isLoading || captcha.running}
            >
              {t('login.continue')}
            </Button>
            {renderLinks()}
          </form>
        </Form>
      )}

      {contactMethod === 'phone' && authMethod === 'password' && (
        <Form {...phonePasswordForm} key="phone-password-form">
          <form
            onSubmit={phonePasswordForm.handleSubmit(onPhonePasswordSubmit)}
            className={cn('flex flex-col gap-4', className)}
            {...props}
          >
            <FormField
              control={phonePasswordForm.control}
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
            <FormField
              control={phonePasswordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      startIcon={Lock}
                      disabled={isLoading}
                      placeholder={t('form.password')}
                      className="text-base md:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <InviteCodeEntry />
            <Button
              type="submit"
              variant="default"
              className="w-full disabled:opacity-60"
              loading={isLoading}
            >
              {t('login.submit')}
            </Button>
            {renderLinks()}
          </form>
        </Form>
      )}
    </div>
  );
}
