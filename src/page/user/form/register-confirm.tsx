import * as z from 'zod';
import i18next from 'i18next';
import { useState } from 'react';
import { http } from '@/lib/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  FormItem,
  FormField,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(2, i18next.t('form.username_min'))
      .max(32, i18next.t('form.username_max')),
    password: z
      .string()
      .min(8, i18next.t('form.password_min'))
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, i18next.t('form.password_reg')),
    password_repeat: z.string(),
  })
  .refine((data) => data.password === data.password_repeat, {
    message: i18next.t('form.password_mismatch'),
    path: ['password_repeat'],
  });

type TRegisterForm = z.infer<typeof registerSchema>;

export function RegisterConFirmForm() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const form = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      password_repeat: '',
    },
  });
  const handleSubmit = (data: TRegisterForm) => {
    setIsLoading(true);
    http
      .post('sign-up/confirm', { ...data, token })
      .then((response) => {
        localStorage.setItem('uid', response.id);
        localStorage.setItem('token', response.access_token);
        navigate('/', { replace: true });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (!token) {
    return (
      <div className="text-center text-sm">
        <p>{t('form.invalid_request')}</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder={t('form.username')}
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
        <Button type="submit" className="w-full" loading={isLoading}>
          {t('register.submit')}
        </Button>
      </form>
    </Form>
  );
}
