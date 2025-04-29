import * as z from 'zod';
import i18next from 'i18next';
import { toast } from 'sonner';
import useUser from '@/hooks/use-user';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
  FormDescription,
} from '@/components/ui/form';

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, i18next.t('form.username_min'))
    .max(32, i18next.t('form.username_max')),
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
    .optional()
    .refine(
      (password) => {
        if (!password || password.length <= 0) {
          return true;
        }
        if (
          password.length < 8 ||
          !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
        ) {
          return false;
        }
        return true;
      },
      {
        message: i18next.t('form.password_reg'),
      },
    ),
  password_repeat: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm() {
  const { t } = useTranslation();
  const { user, onChange } = useUser();
  const [loading, onLoading] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: '',
      password: '',
      username: '',
      password_repeat: '',
    },
  });
  const handleSubmit = (data: ProfileFormValues) => {
    if (data.password || data.password_repeat) {
      if (data.password !== data.password_repeat) {
        toast.error(t('form.password_not_match'), { position: 'top-center' });
        return;
      }
    }
    onLoading(true);
    onChange(data, () => {
      toast.success(t('profile.success'), { position: 'top-center' });
    }).finally(() => {
      onLoading(false);
    });
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    form.setValue('email', user.email);
    form.setValue('username', user.username);
  }, [user]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 px-px"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.username')}</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormDescription>{t('form.email_limit')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.password')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                  disabled={loading}
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
              <FormLabel>{t('form.confirm_password')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          {t('profile.submit')}
        </Button>
      </form>
    </Form>
  );
}
