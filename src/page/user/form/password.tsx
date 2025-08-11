import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/request';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email(i18next.t('form.email.invalid'))
    .refine(
      email => {
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
      }
    ),
});

type TForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<TForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });
  const onSubmit = (data: TForgotPasswordForm) => {
    setIsLoading(true);
    http
      .post('password', {
        email: data.email,
        url: `${location.origin}/user/password/confirm`,
      })
      .then(() => {
        form.resetField('email');
        toast(t('password.done'), {
          position: 'bottom-right',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t('form.email')}
                  autoComplete="email"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>{t('form.email_limit')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full disabled:opacity-60"
          disabled={isLoading}
          loading={isLoading}
        >
          {t('password.reset')}
        </Button>
        <div className="text-center text-sm">
          {t('password.remember')}
          <Link
            to="/user/login"
            className="font-semibold text-primary hover:underline ml-1"
          >
            {t('password.return_to_login')}
          </Link>
        </div>
      </form>
    </Form>
  );
}
