import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { Lock, Mail } from 'lucide-react';
import React, { useState } from 'react';
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
import { cn } from '@/lib/utils';
import { setGlobalCredential } from '@/page/user/util';

const formSchema = z.object({
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
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const state = params.get('state');
  const responseType = params.get('response_type');
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const onSubmit = (data: z.infer<typeof formSchema>) => {
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
        if (clientId && redirectUri) {
          http
            .get(
              `/oauth2/authorize?response_type=${responseType}&client_id=${clientId}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`
            )
            .then(response => {
              location.href = response.redirectUrl;
            });
          return;
        }
        if (redirect) {
          location.href = decodeURIComponent(redirect);
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        setIsLoading(false);
      });
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
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn('flex flex-col gap-4', className)}
          {...props}
        >
          <FormField
            control={form.control}
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
            <Link to="/user/sign-up" className="text-sm ml-1">
              {t('register.submit')}
            </Link>
            {t('form.or')}
            <Link to="/user/password" className="text-sm ml-1">
              {t('password.submit')}
            </Link>
          </Space>
        </form>
      </Form>
    </div>
  );
}
