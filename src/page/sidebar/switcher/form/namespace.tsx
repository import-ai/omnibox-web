import * as z from 'zod';
import i18next from 'i18next';
import { useState } from 'react';
import { http } from '@/lib/request';
import { useForm } from 'react-hook-form';
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
} from '@/components/ui/form';

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
      .post('namespaces', { name: data.name })
      .then(data => {
        location.href = `/${data.id}/chat`;
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
