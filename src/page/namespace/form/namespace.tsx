import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { createNamespace } from '@/utils/namespace';
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
  name: z.string().min(2, '至少2个字符').max(32, '最多32个字符'),
});

type GenerateFormValues = z.infer<typeof generateFormSchema>;

export default function GenerateForm() {
  const [loading, setLoading] = useState(false);
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      name: '',
    },
  });
  const handleSubmit = (data: GenerateFormValues) => {
    setLoading(true);
    createNamespace(data.name)
      .then(() => {
        window.location.reload();
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
              <FormLabel>空间名称</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          保存
        </Button>
      </form>
    </Form>
  );
}
