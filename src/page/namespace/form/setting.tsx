import * as z from 'zod';
import { toast } from 'sonner';
import useApp from '@/hooks/use-app';
import { http } from '@/utils/request';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
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
    .min(2, 'At least 2 characters')
    .max(22, 'At most 32 characters'),
});

type FormValues = z.infer<typeof FormSchema>;

export default function SettingForm() {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const namespaceId = localStorage.getItem('namespace');
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
    },
  });
  const handleSubmit = (data: FormValues) => {
    setLoading(true);
    http
      .patch(`namespaces/${namespaceId}`, data)
      .then(() => {
        app.fire('namespace_refetch');
        toast('Updated');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    http.get(`namespaces/${namespaceId}`).then((data) => {
      form.setValue('name', data.name);
    });
  }, []);

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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          Save
        </Button>
      </form>
    </Form>
  );
}
