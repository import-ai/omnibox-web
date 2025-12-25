import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { http } from '@/lib/request';

interface IProps {
  namespaceId: string;
  onFinish: () => void;
}

const FormSchema = z.object({
  namespaceRole: z.string(),
  rootPermission: z.string(),
});

type FormValues = z.infer<typeof FormSchema>;

export function AddNamespaceInvitationForm(props: IProps) {
  const { namespaceId, onFinish } = props;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {},
  });

  const namespaceRole = form.watch('namespaceRole');
  const isAdmin = namespaceRole === 'admin';

  useEffect(() => {
    if (isAdmin) {
      form.setValue('rootPermission', 'full_access');
    }
  }, [isAdmin, form]);

  const handleSubmit = (val: FormValues) => {
    setLoading(true);
    http
      .post(`/namespaces/${namespaceId}/invitations`, {
        namespaceRole: val.namespaceRole,
        rootPermission: val.rootPermission,
      })
      .then(() => {
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
          name="namespaceRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.role')}</FormLabel>
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
          name="rootPermission"
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
        <Button
          type="submit"
          disabled={loading}
          loading={loading}
          className="w-full"
        >
          {t('manage.submit')}
        </Button>
      </form>
    </Form>
  );
}
