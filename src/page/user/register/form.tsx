import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { PhoneNumberInput } from '@/components/phone-input';
import { SupportedEmailLink } from '@/components/supported-email-link';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { usePhoneConfig } from '@/hooks/use-phone-config';
import isEmail from '@/lib/is-email';
import { http } from '@/lib/request';
import { buildUrl } from '@/lib/utils';
import { phoneSchema } from '@/lib/validation-schemas';

import type { RegisterMode } from './index';

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'form.email_required')
    .refine(val => isEmail(val), { message: 'form.email_invalid' }),
});

const phoneFormSchema = z.object({
  phone: phoneSchema,
});

interface IProps {
  children: React.ReactNode;
  mode: RegisterMode;
  setMode: (mode: RegisterMode) => void;
}

export function RegisterForm({ children, mode }: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emailParam = params.get('email');
  const phoneParam = params.get('phone');
  const redirect = params.get('redirect');
  const [isLoading, setIsLoading] = useState(false);
  const { allowedCountries } = usePhoneConfig();

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
    setIsLoading(true);
    try {
      const response = await http.post('auth/send-signup-otp', {
        email: data.email,
        url: `${window.location.origin}${buildUrl('/user/verify-otp', { redirect })}`,
      });

      if (response.exists) {
        toast.error(t('register.email_already_exists'), {
          position: 'bottom-right',
        });
        navigate(buildUrl('/user/login', { email: data.email, redirect }));
        return;
      }

      navigate(buildUrl('/user/verify-otp', { email: data.email, redirect }));
    } catch {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (data: z.infer<typeof phoneFormSchema>) => {
    setIsLoading(true);
    try {
      const response = await http.post('auth/send-signup-phone-otp', {
        phone: data.phone,
      });

      if (response.exists) {
        toast.error(t('register.phone_already_exists'), {
          position: 'bottom-right',
        });
        navigate(buildUrl('/user/login', { phone: data.phone, redirect }));
        return;
      }

      navigate(buildUrl('/user/verify-otp', { phone: data.phone, redirect }));
    } catch {
      setIsLoading(false);
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

      {mode === 'email-otp' && (
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
                    <Input
                      type="email"
                      startIcon={Mail}
                      placeholder={t('form.email')}
                      autoComplete="email"
                      className="text-base md:text-sm"
                      disabled={isLoading}
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
              className="w-full disabled:opacity-60"
              loading={isLoading}
            >
              {t('register.submit')}
            </Button>
            <div className="text-center text-sm">
              {t('form.exist_account')}
              <Link
                to={buildUrl('/user/login', {
                  email: emailForm.getValues('email'),
                  redirect,
                })}
                className="text-sm hover:underline underline-offset-2"
              >
                {t('login.submit')}
              </Link>
            </div>
          </form>
        </Form>
      )}

      {mode === 'phone-otp' && (
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
                to={buildUrl('/user/login', {
                  phone: phoneForm.getValues('phone'),
                  redirect,
                })}
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
