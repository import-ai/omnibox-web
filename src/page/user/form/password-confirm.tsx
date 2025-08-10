import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/request';

const forgotPasswordSchema = z.object({
  password: z
    .string()
    .min(8, i18next.t('form.password_min'))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, i18next.t('form.password_reg')),
  password_repeat: z.string(),
});

type TForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<TForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      password: '',
      password_repeat: '',
    },
  });
  const onSubmit = (data: TForgotPasswordForm) => {
    setIsLoading(true);
    http
      .post('password/confirm', {
        token,
        password: data.password,
        password_repeat: data.password_repeat,
      })
      .then(() => {
        toast.success(t('password.success'));
        navigate('/user/login', { replace: true });
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('form.password')}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password_repeat"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('form.confirm_password')}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
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
          {t('password.submit')}
        </Button>
      </form>
    </Form>
  );
}
