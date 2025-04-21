import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormField,
  FormMessage,
  FormControl,
  FormDescription,
} from '@/components/ui/form';

const FormSchema = z.object({
  name: z.string().min(2, '至少32个字符').max(22, '最多32个字符'),
});

type FormValues = z.infer<typeof FormSchema>;

export default function SettingForm() {
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
    },
  });
  const handleSubmit = (data: FormValues) => {
    setLoading(true);
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="名称" {...field} disabled={loading} />
              </FormControl>
              <FormDescription>
                你可以使用你的组织或公司名称，保持简洁。
              </FormDescription>
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
