import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
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
  onFinish: () => void;
}

export default function AddGroupForm(props: IProps) {
  const { data, onFinish } = props;
  const params = useParams();
  const { t } = useTranslation();
  const namespace_id = params.namespace_id || '';
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
    },
  });
  const handleSubmit = (val: FormValues) => {
    setLoading(true);
    if (data.id) {
      http
        .patch(`/namespaces/${namespace_id}/groups/${data.id}`, {
          title: val.title,
        })
        .then(() => {
          onFinish();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      http
        .post(`/namespaces/${namespace_id}/groups`, {
          title: val.title,
        })
        .then(() => {
          form.resetField('title');
          onFinish();
        })
        .finally(() => {
          setLoading(false);
        });
    }
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
              <FormLabel>{t('manage.group_name')}</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
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
            {t('manage.submit')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
