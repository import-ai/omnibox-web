import * as z from 'zod';
import i18next from 'i18next';
import { toast } from 'sonner';
import { useState } from 'react';
import { http } from '@/lib/request';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormField,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

const registerSchema = z.object({
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
});

type TRegisterForm = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
    },
  });
  const handleSubmit = (data: TRegisterForm) => {
    setIsLoading(true);
    http
      .post('sign-up', {
        email: data.email,
        url: `${location.origin}/user/sign-up/comfirm`,
      })
      .then(() => {
        form.resetField('email');
        toast(t('success'), {
          position: 'top-center',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
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
        <Button type="submit" className="w-full" loading={isLoading}>
          {t('register.submit')}
        </Button>
        <div className="text-center text-sm">
          {t('form.exist_account')}
          <Link
            to="/user/login"
            className="font-semibold text-primary hover:underline ml-1"
          >
            {t('login.submit')}
          </Link>
        </div>
      </form>
    </Form>
  );
}
