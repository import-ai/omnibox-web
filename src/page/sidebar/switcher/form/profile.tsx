import { zodResolver } from '@hookform/resolvers/zod';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import i18next from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import Loading from '@/components/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import useUser from '@/hooks/use-user';
import { isEmoji } from '@/lib/emoji';
import isEmail from '@/lib/is-email';
import { http } from '@/lib/request';

import EmailValidate from './email-validate';

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, i18next.t('form.username_min'))
    .max(32, i18next.t('form.username_max'))
    .refine(
      value => {
        return !Array.from(value).some(char => isEmoji(char));
      },
      {
        message: i18next.t('form.username_no_emoji'),
      }
    ),
  email: z
    .string()
    .refine(
      email => {
        if (!email) {
          return false;
        }
        if (!isEmail(email)) {
          return false;
        }
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
    )
    .optional(),
  password: z
    .string()
    .optional()
    .refine(
      password => {
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
      }
    ),
  password_repeat: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm() {
  const { t } = useTranslation();
  const [open, onOpen] = useState(false);
  const { user, onChange, loading } = useUser();
  const [submiting, onSubmiting] = useState(false);
  const submitData = useRef<ProfileFormValues | null>(null);
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
        toast.error(t('form.password_not_match'), { position: 'bottom-right' });
        return;
      }
    }
    if (data.email && user.email !== data.email) {
      http
        .post('/user/email/validate', {
          email: data.email,
        })
        .then(() => {
          submitData.current = data;
          onOpen(true);
          toast(t('email.send_success'), { position: 'bottom-right' });
        });
      return;
    }

    if (!data.username.trim().length) {
      toast.error(t('form.username_not_emptyStr'), {
        position: 'bottom-right',
      });
      return;
    }

    onSubmiting(true);
    onChange(data, () => {
      toast.success(t('profile.success'), { position: 'bottom-right' });
    }).finally(() => {
      onSubmiting(false);
    });
  };
  const handleEmailValidateFinish = (code: string) => {
    const query = submitData.current;
    if (!query) {
      return;
    }
    onSubmiting(true);
    onChange({ ...query, code }, () => {
      toast.success(t('profile.success'), { position: 'bottom-right' });
    }).finally(() => {
      onOpen(false);
      onSubmiting(false);
    });
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    form.setValue('email', user.email || '');
    form.setValue('username', user.username || '');
  }, [user]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpen}>
        <DialogContent className="w-[90%] sm:w-1/2 max-w-7xl">
          <DialogHeader>
            <DialogTitle>{t('email.validate')}</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>{t('email.description')}</DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          <EmailValidate onFinish={handleEmailValidateFinish} />
        </DialogContent>
      </Dialog>
      <Form {...form}>
        <form
          className="space-y-4 px-px"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.username')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={submiting} />
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
                    disabled={submiting}
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
                    disabled={submiting}
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
                    disabled={submiting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={submiting} loading={submiting}>
            {t('profile.submit')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
