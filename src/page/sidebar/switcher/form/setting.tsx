import * as z from 'zod';
import i18next from 'i18next';
import { toast } from 'sonner';
import Loading from '@/components/loading';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import useNamespace from '@/hooks/use-namespace';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
} from '@/components/ui/form';

const FormSchema = z.object({
  name: z
    .string()
    .min(2, i18next.t('namespace.min'))
    .max(22, i18next.t('namespace.max')),
});

type FormValues = z.infer<typeof FormSchema>;

export default function SettingForm() {
  const { t } = useTranslation();
  const [submiting, onSubmiting] = useState(false);
  const { app, data, onChange, loading } = useNamespace();
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
    },
  });
  const handleSubmit = (data: FormValues) => {
    onSubmiting(true);
    onChange(data)
      .then(() => {
        app.fire('namespaces_refetch');
        toast(t('namespace.success'));
      })
      .finally(() => {
        onSubmiting(false);
      });
  };

  useEffect(() => {
    if (!data.id) {
      return;
    }
    form.setValue('name', data.name);
  }, [data]);

  if (loading) {
    return <Loading />;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 px-px"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('namespace.name')}</FormLabel>
              <FormControl>
                <Input {...field} disabled={submiting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submiting} loading={submiting}>
          {t('namespace.submit')}
        </Button>
      </form>
    </Form>
  );
}
