import * as z from 'zod';
import { toast } from 'sonner';
import { useEffect } from 'react';
import useUser from '@/hooks/use-user';
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
  FormDescription,
} from '@/components/ui/form';

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, '用户名至少2个字符')
    .max(32, '用户名最多32个字符'),
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
  password: z
    .string()
    .optional()
    .refine(
      (password) => {
        if (!password || password.length <= 0) {
          return true;
        }
        if (
          password.length < 8 ||
          !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
        ) {
          return false;
        }
        return true;
      },
      {
        message: '密码必须包含大小写字母和数字',
      }
    ),
  password_repeat: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm() {
  const { user, loading, onChange } = useUser();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: '',
      password: '',
      username: '',
      password_repeat: '',
    },
  });
  const handleSubmit = (data: ProfileFormValues) => {
    if (data.password || data.password_repeat) {
      if (data.password !== data.password_repeat) {
        toast.error('两次输入的密码不一致', { position: 'top-center' });
        return;
      }
    }
    onChange(data, () => {
      toast.success('个人资料已更新', { position: 'top-center' });
    });
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    form.setValue('email', user.email);
    form.setValue('username', user.username);
  }, [user]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 px-px"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  placeholder="邮箱"
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password_repeat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>确认密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          更新个人资料
        </Button>
      </form>
    </Form>
  );
}
