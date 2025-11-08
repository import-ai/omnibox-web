import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { Lock, Mail } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import Space from '@/components/space';
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
import { setGlobalCredential } from '@/page/user/util';

const emailFormSchema = z.object({
  email: z.string().email(i18next.t('form.email_invalid')),
});

const passwordFormSchema = z.object({
  email: z.string().nonempty(i18next.t('form.email_or_username_invalid')),
  password: z
    .string()
    .min(8, i18next.t('form.password_min'))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, i18next.t('form.password_reg')),
});

interface IProps extends React.ComponentPropsWithoutRef<'form'> {
  children: React.ReactNode;
}

export function LoginForm({ className, children, ...props }: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const emailParam = params.get('email');
  const [isLoading, setIsLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const linkClass =
    'text-sm hover:underline dark:text-[#60a5fa] underline-offset-2';

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: emailParam || '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      email: emailParam || '',
      password: '',
    },
  });

  const onEmailSubmit = async (data: z.infer<typeof emailFormSchema>) => {
    const allowedDomains = ['gmail.com', 'outlook.com', '163.com', 'qq.com'];
    const domain = data.email.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      toast(t('form.email_limit_rule'), { position: 'bottom-right' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await http.post('auth/send-otp', {
        email: data.email,
        url: `${window.location.origin}${buildUrl('/user/verify-otp', { redirect })}`,
      });

      // Check if user exists - if not, redirect to registration
      if (!response.exists) {
        navigate(buildUrl('/user/sign-up', { email: data.email, redirect }));
        return;
      }

      // Navigate to OTP verification page
      navigate(buildUrl('/user/verify-otp', { email: data.email, redirect }));
    } catch (err: any) {
      setIsLoading(false);
      const errorMessage =
        err.response?.data?.message || t('login.error_sending_otp');
      toast.error(errorMessage, { position: 'bottom-right' });
    }
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordFormSchema>) => {
    if (isEmail(data.email)) {
      const allowedDomains = ['gmail.com', 'outlook.com', '163.com', 'qq.com'];
      const domain = data.email.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        toast(t('form.email_limit_rule'), { position: 'bottom-right' });
        return;
      }
    }
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
        if (err.response.data.code === 'user_not_found') {
          navigate('/user/sign-up');
        }
      });
  };

  useEffect(() => {
    // Extension login flag, to support Google and WeChat login
    if (location.search === '?from=extension') {
      localStorage.setItem('extension_login', 'true');
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 pt-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{t('login.title')}</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {t('login.description')}
        </p>
      </div>
      {children}

      {!usePassword ? (
        <Form {...emailForm}>
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
                    {t('form.email_limit_rule')}
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
            <Space className="text-sm justify-center">
              <button
                type="button"
                onClick={() => setUsePassword(true)}
                className={linkClass}
              >
                {t('login.use_password')}
              </button>
              {t('form.or')}
              <Link
                to={buildUrl('/user/sign-up', {
                  email: emailParam,
                  redirect,
                })}
                className={linkClass}
              >
                {t('login.sign_up')}
              </Link>
            </Space>
          </form>
        </Form>
      ) : (
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className={cn('flex flex-col gap-4', className)}
            {...props}
          >
            <FormField
              control={passwordForm.control}
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
                    {t('form.email_limit_rule')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
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
            <Space className="text-sm justify-center">
              <button
                type="button"
                onClick={() => setUsePassword(false)}
                className={linkClass}
              >
                {t('login.use_email')}
              </button>
              {t('form.or')}
              <Link
                to={buildUrl('/user/sign-up', {
                  email: emailParam,
                  redirect,
                })}
                className={linkClass}
              >
                {t('login.sign_up')}
              </Link>
            </Space>
          </form>
        </Form>
      )}
    </div>
  );
}
