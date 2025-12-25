import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isAllowedEmailDomain } from '@/lib/email-validation';
import isEmail from '@/lib/is-email';
import { http } from '@/lib/request';

const FormSchema = z.object({
  email: z
    .string()
    .min(1, i18next.t('form.email_required'))
    .refine(val => isEmail(val), { message: i18next.t('form.email_invalid') })
    .refine(val => isAllowedEmailDomain(val), {
      message: i18next.t('form.email_domain_not_allowed'),
    }),
  role: z
    .string()
    .min(2, i18next.t('invite.min'))
    .max(22, i18next.t('invite.max')),
  permission: z.string(),
});

type FormValues = z.infer<typeof FormSchema>;

interface IProps {
  onFinish: () => void;
}

export default function InviteForm(props: IProps) {
  const { onFinish } = props;
  const { t } = useTranslation();
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
      role: '',
    },
  });
  const handleSubmit = (data: FormValues) => {
    setLoading(true);
    http
      .post('invite', {
        role: data.role,
        emails: [data.email],
        permission: data.permission,
        namespace: namespace_id,
        inviteUrl: `${location.origin}/invite/confirm`,
        registerUrl: `${location.origin}/user/accept-invite`,
      })
      .then(() => {
        form.resetField('email');
        form.resetField('role');
        toast(t('invite.success'), { position: 'bottom-right' });
        onFinish();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 px-px"
      >
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
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Select
                  defaultValue={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="owner">{t('invite.owner')}</SelectItem>
                    <SelectItem value="member">{t('invite.member')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="permission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('manage.permission')}</FormLabel>
              <FormControl>
                <Select
                  defaultValue={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full_access">
                      {t('permission.full_access')}
                    </SelectItem>
                    <SelectItem value="can_edit">
                      {t('permission.can_edit')}
                    </SelectItem>
                    <SelectItem value="can_comment">
                      {t('permission.can_comment')}
                    </SelectItem>
                    <SelectItem value="can_view">
                      {t('permission.can_view')}
                    </SelectItem>
                    <SelectItem value="no_access">
                      {t('permission.no_access')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
          >
            {t('invite.submit')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
