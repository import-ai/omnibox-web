import * as z from 'zod';
import { useState } from 'react';
import { http } from '@/utils/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toDefaultNamespace, createNamespace } from '@/utils/namespace';
import {
  Form,
  FormItem,
  FormField,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(2, '用户名至少2个字符')
      .max(32, '用户名最多32个字符'),
    password: z
      .string()
      .min(8, '密码至少8个字符')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
    password_repeat: z.string(),
  })
  .refine((data) => data.password === data.password_repeat, {
    message: '两次输入的密码不一致',
    path: ['password_repeat'],
  });

type TRegisterForm = z.infer<typeof registerSchema>;

export function RegisterComFirmForm() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const form = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      password_repeat: '',
    },
  });
  const handleSubmit = (data: TRegisterForm) => {
    setIsLoading(true);
    http
      .post('register-confirm', { ...data, token })
      .then((response) => {
        localStorage.setItem('uid', response.id);
        localStorage.setItem('token', response.access_token);
        createNamespace(`${response.username}'s Namespace`).then(() => {
          toDefaultNamespace(navigate, { replace: true });
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (!token) {
    return (
      <div className="text-center text-sm">
        <p>请求参数不合法</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="用户名" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="密码"
                  {...field}
                  disabled={isLoading}
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
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="确认密码"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" loading={isLoading}>
          注册
        </Button>
      </form>
    </Form>
  );
}
