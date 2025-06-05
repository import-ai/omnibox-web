import * as z from 'zod';
import { useEffect, useState } from 'react';
import { http } from '@/lib/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormField,
  FormMessage,
  FormControl,
} from '@/components/ui/form';

const FormSchema = z.object({
  title: z.string(),
});

type FormValues = z.infer<typeof FormSchema>;

interface IProps {
  data: {
    id?: string;
    title?: string;
    open: boolean;
  };
  namespaceId: string;
  onFinish: () => void;
}

export default function EditForm(props: IProps) {
  const { data, namespaceId, onFinish } = props;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
    },
  });
  const handleSubmit = (val: FormValues) => {
    setLoading(true);
    http
      .patch(`namespaces/${namespaceId}/conversations/${data.id}`, {
        title: val.title,
      })
      .then(onFinish)
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!data.open) {
      return;
    }
    form.setValue('title', data.title || '');
  }, [data]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 px-px"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          {t('ok')}
        </Button>
      </form>
    </Form>
  );
}
