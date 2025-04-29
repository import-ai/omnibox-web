import { z } from 'zod';
import i18next from 'i18next';
import { cn } from '@/lib/utils';
import { http } from '@/lib/request';
import Space from '@/components/space';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock } from 'lucide-react';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';
import { initNamespace } from '@/lib/namespace';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  FormItem,
  FormField,
  FormMessage,
  FormControl,
  FormDescription,
} from '@/components/ui/form';

const formSchema = z.object({
  email: z
    .string()
    .email(i18next.t('form.email_invalid'))
    .refine(
      (email) => {
        const allowedDomains = [
          'gmail.com',
          'outlook.com',
          '163.com',
          'qq.com',
        ];
        const domain = email.split('@')[1];
        return allowedDomains.includes(domain);
      },
      {
        message: i18next.t('form.email_limit_rule'),
      },
    ),
  password: z
    .string()
    .min(8, i18next.t('form.password_min'))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, i18next.t('form.password_reg')),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    http
      .post('login', data)
      .then((response) => {
        localStorage.setItem('uid', response.id);
        localStorage.setItem('token', response.access_token);
        initNamespace().then((returnValue) => {
          setIsLoading(false);
          if (returnValue) {
            if (redirect) {
              location.href = decodeURIComponent(redirect);
            } else {
              navigate('/', { replace: true });
            }
          } else {
            navigate('/user/login', { replace: true });
          }
        });
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('flex flex-col gap-6', className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t('login.description')}
          </p>
        </div>
        <div className="grid gap-6">
          <FormField
            control={form.control}
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
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t('form.email_limit_rule')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    startIcon={Lock}
                    disabled={isLoading}
                    placeholder={t('form.password')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" loading={isLoading}>
            {t('login.submit')}
          </Button>
        </div>
        <Space className="text-sm justify-center">
          <Link to="/user/sign-up" className="text-sm text-blue-700 ml-1">
            {t('register.submit')}
          </Link>
          {t('form.or')}
          <Link to="/user/password" className="text-sm text-blue-700 ml-1">
            {t('password.submit')}
          </Link>
        </Space>
      </form>
    </Form>
  );
}
