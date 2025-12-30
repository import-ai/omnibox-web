import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
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
import { SUPPORTED_EMAIL_DOCS_LINK } from '@/const';
import { getDocsLink } from '@/lib/get-docs-link';
import isEmail from '@/lib/is-email';
import { http } from '@/lib/request';

interface IProps {
  onFinish: () => void;
}

export default function InviteForm(props: IProps) {
  const { onFinish } = props;
  const { t, i18n } = useTranslation();
  const params = useParams();
  const namespace_id = params.namespace_id || '';
  const [loading, setLoading] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t('form.email_required'))
          .refine(val => isEmail(val), { message: t('form.email_invalid') }),
        role: z.string().min(2, t('invite.min')).max(22, t('invite.max')),
        permission: z.string(),
      }),
    [t]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: '',
    },
  });

  const role = form.watch('role');
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      form.setValue('permission', 'full_access');
    }
  }, [isAdmin, form]);

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
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
              <FormDescription>
                <a
                  href={getDocsLink(SUPPORTED_EMAIL_DOCS_LINK, i18n.language)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t('form.supported_email_providers')}
                </a>
              </FormDescription>
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
                    <SelectItem value="admin">{t('invite.admin')}</SelectItem>
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
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isAdmin}
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
