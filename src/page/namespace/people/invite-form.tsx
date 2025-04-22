import * as z from 'zod';
import { toast } from 'sonner';
import { useState } from 'react';
import { http } from '@/utils/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from '@/components/ui/select';
import {
  Form,
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
  FormDescription,
} from '@/components/ui/form';

const FormSchema = z.object({
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .refine(
      (email) => {
        const allowedDomains = [
          'gmail.com',
          'outlook.com',
          '163.com',
          'qq.com',
        ];
        const domain = email.split('@')[1];
        return allowedDomains.includes(domain);
      },
      {
        message: '邮箱必须是 Gmail、Outlook、163 或 QQ 的邮箱',
      }
    ),
  role: z.string().min(2, '至少2个字符').max(22, '最多22个字符'),
});

type FormValues = z.infer<typeof FormSchema>;

export default function InviteForm() {
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
      role: '',
    },
  });
  const handleSubmit = (data: FormValues) => {
    setLoading(true);
    const namespace = localStorage.getItem('namespace');
    http
      .post(`namespaces/invite`, {
        ...data,
        namespace,
        inviteUrl: `${location.origin}/user/invite`,
        registerUrl: `${location.origin}/user/register-comfirm`,
      })
      .then(() => {
        toast('已邀请');
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
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormDescription>
                Limit gmail、outlook、163、qq、only
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
              <FormLabel>角色</FormLabel>
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
                    <SelectItem value="owner">工作空间所有者</SelectItem>
                    <SelectItem value="member">成员</SelectItem>
                  </SelectContent>
                </Select>
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
