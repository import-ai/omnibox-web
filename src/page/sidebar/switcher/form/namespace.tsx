import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { http } from '@/lib/request';

const generateFormSchema = z.object({
  name: z
    .string()
    .min(2, i18next.t('namespace.min'))
    .max(32, i18next.t('namespace.max')),
});

type GenerateFormValues = z.infer<typeof generateFormSchema>;

export default function GenerateForm() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      name: '',
    },
  });
  const handleSubmit = (data: GenerateFormValues) => {
    setLoading(true);
    http
      .post('namespaces', { name: data.name }, { mute: true })
      .then(data => {
        location.href = `/${data.id}/chat`;
      })
      .catch(err => {
        if (err?.response?.data?.code === 'namespace_conflict') {
          toast.error(t('namespace.conflict'), { position: 'bottom-right' });
        } else {
          toast.error(err.message, { position: 'bottom-right' });
        }
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('namespace.name')}</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          {t('namespace.submit')}
        </Button>
      </form>
    </Form>
  );
}
