import { zodResolver } from '@hookform/resolvers/zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Lock, Mail } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { PhoneNumberInput } from '@/components/phone-input';
import Space from '@/components/space';
import { SupportedEmailLink } from '@/components/supported-email-link';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import isEmail from '@/lib/is-email';
import { http } from '@/lib/request';
import { buildUrl, cn } from '@/lib/utils';
import { passwordSchema } from '@/lib/validation-schemas';
import { setGlobalCredential } from '@/page/user/util';

import type { LoginMode } from './index';

const emailFormSchema = z.object({
  email: z
    .string()
    .min(1, 'form.email_required')
    .refine(val => isEmail(val), { message: 'form.email_invalid' }),
});

const emailPasswordFormSchema = z.object({
  email: z.string().min(1, 'form.email_or_username_invalid'),
  password: passwordSchema,
});

const phoneFormSchema = z.object({
  phone: z
    .string()
    .min(1, 'form.phone_required')
    .refine(val => isValidPhoneNumber(val || ''), {
      message: 'form.phone_invalid',
    }),
});

const phonePasswordFormSchema = z.object({
  phone: z
    .string()
    .min(1, 'form.phone_required')
    .refine(val => isValidPhoneNumber(val || ''), {
      message: 'form.phone_invalid',
    }),
  password: passwordSchema,
});

interface IProps extends React.ComponentPropsWithoutRef<'form'> {
  children: React.ReactNode;
  mode: LoginMode;
  setMode: (mode: LoginMode) => void;
}

export function LoginForm({
  className,
  children,
  mode,
  setMode,
  ...props
}: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const emailParam = params.get('email');
  const phoneParam = params.get('phone');
  const [isLoading, setIsLoading] = useState(false);
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

  const onEmailSubmit = async (data: z.infer<typeof emailFormSchema>) => {
    setIsLoading(true);
    try {
      const response = await http.post('auth/send-otp', {
        email: data.email,
        url: `${window.location.origin}${buildUrl('/user/verify-otp', { redirect })}`,
      });

      if (!response.exists) {
        toast.error(t('login.email_not_exists'), { position: 'bottom-right' });
        navigate(buildUrl('/user/sign-up', { email: data.email, redirect }));
        return;
      }

      navigate(buildUrl('/user/verify-otp', { email: data.email, redirect }));
    } catch {
      setIsLoading(false);
    }
  };

  const onEmailPasswordSubmit = (
    data: z.infer<typeof emailPasswordFormSchema>
  ) => {
    setIsLoading(true);
    http
      .post('login', data)
      .then(response => {
        setGlobalCredential(response.id, response.access_token);
        if (redirect) {
          location.href = decodeURIComponent(redirect);
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(err => {
        setIsLoading(false);
        if (err.response?.data?.code === 'user_not_found') {
          navigate('/user/sign-up');
        }
      });
  };

  const onPhoneSubmit = async (data: z.infer<typeof phoneFormSchema>) => {
    setIsLoading(true);
    try {
      const response = await http.post('auth/send-phone-otp', {
        phone: data.phone,
      });

      if (!response.exists) {
        toast.error(t('login.phone_not_exists'), { position: 'bottom-right' });
        navigate(buildUrl('/user/sign-up', { phone: data.phone, redirect }));
        return;
      }

      navigate(buildUrl('/user/verify-otp', { phone: data.phone, redirect }));
    } catch {
      setIsLoading(false);
    }
  };

  const onPhonePasswordSubmit = (
    data: z.infer<typeof phonePasswordFormSchema>
  ) => {
    setIsLoading(true);
    http
      .post('login', { phone: data.phone, password: data.password })
      .then(response => {
        setGlobalCredential(response.id, response.access_token);
        if (redirect) {
          location.href = decodeURIComponent(redirect);
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(err => {
        setIsLoading(false);
        if (err.response?.data?.code === 'user_not_found') {
          navigate('/user/sign-up');
        }
      });
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('from') === 'extension') {
      localStorage.setItem('extension_login', 'true');
    }
  }, []);

  const renderLinks = () => {
    if (mode === 'email-otp') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              emailPasswordForm.setValue('email', emailForm.getValues('email'));
              setMode('email-password');
            }}
            className={linkClass}
          >
            {t('login.use_password')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl('/user/sign-up', {
              email: emailForm.getValues('email'),
              redirect,
            })}
            className={linkClass}
          >
            {t('login.sign_up')}
          </Link>
        </Space>
      );
    }

    if (mode === 'email-password') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              emailForm.setValue('email', emailPasswordForm.getValues('email'));
              setMode('email-otp');
            }}
            className={linkClass}
          >
            {t('login.use_otp')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl('/user/sign-up', {
              email: emailPasswordForm.getValues('email'),
              redirect,
            })}
            className={linkClass}
          >
            {t('login.sign_up')}
          </Link>
        </Space>
      );
    }

    if (mode === 'phone-otp') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              phonePasswordForm.setValue('phone', phoneForm.getValues('phone'));
              setMode('phone-password');
            }}
            className={linkClass}
          >
            {t('login.use_password')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl('/user/sign-up', {
              phone: phoneForm.getValues('phone'),
              redirect,
            })}
            className={linkClass}
          >
            {t('login.sign_up')}
          </Link>
        </Space>
      );
    }

    if (mode === 'phone-password') {
      return (
        <Space className="text-sm justify-center">
          <button
            type="button"
            onClick={() => {
              phoneForm.setValue('phone', phonePasswordForm.getValues('phone'));
              setMode('phone-otp');
            }}
            className={linkClass}
          >
            {t('login.use_otp')}
          </button>
          {t('form.or')}
          <Link
            to={buildUrl('/user/sign-up', {
              phone: phonePasswordForm.getValues('phone'),
              redirect,
            })}
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

      {mode === 'email-otp' && (
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
                    <Input
                      type="email"
                      startIcon={Mail}
                      autoComplete="email"
                      disabled={isLoading}
                      placeholder={t('form.email')}
                      className="text-base md:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    <SupportedEmailLink />
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="default"
              className="w-full disabled:opacity-60"
              loading={isLoading}
            >
              {t('login.continue')}
            </Button>
            {renderLinks()}
          </form>
        </Form>
      )}

      {mode === 'email-password' && (
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
                    <Input
                      type="text"
                      startIcon={Mail}
                      autoComplete="email"
                      disabled={isLoading}
                      placeholder={t('form.email_or_username')}
                      className="text-base md:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    <SupportedEmailLink />
                  </FormDescription>
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

      {mode === 'phone-otp' && (
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="default"
              className="w-full disabled:opacity-60"
              loading={isLoading}
            >
              {t('login.continue')}
            </Button>
            {renderLinks()}
          </form>
        </Form>
      )}

      {mode === 'phone-password' && (
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
