import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

const registerSchema = z.object({
  email: z
    .string()
    .email(i18next.t('form.email_invalid'))
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

type TRegisterForm = z.infer<typeof registerSchema>;

interface IProps {
  children: React.ReactNode;
}

export function RegisterForm({ children }: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emailParam = params.get('email');
  const redirect = params.get('redirect');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: emailParam || '',
    },
  });

  useEffect(() => {
    // If email is provided in URL, pre-fill and optionally auto-submit
    if (emailParam) {
      form.setValue('email', emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (data: TRegisterForm) => {
    setIsLoading(true);
    try {
      const response = await http.post('auth/send-signup-otp', {
        email: data.email,
        url: `${window.location.origin}/user/verify-otp${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`,
      });

      // If user already exists, redirect to login
      if (response.exists) {
        navigate(
          `/user/login?email=${encodeURIComponent(data.email)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`
        );
        return;
      }

      // Navigate to OTP verification page for registration
      navigate(
        `/user/verify-otp?email=${encodeURIComponent(data.email)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`
      );
    } catch (err: any) {
      setIsLoading(false);
      const errorMessage =
        err.response?.data?.message || t('register.error_sending_otp');
      toast.error(errorMessage, { position: 'bottom-right' });
    }
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            loading={isLoading}
          >
            {t('register.submit')}
          </Button>
          <div className="text-center text-sm">
            {t('form.exist_account')}
            <Link
              to="/user/login"
              className="text-sm hover:underline underline-offset-2"
            >
              {t('login.submit')}
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
