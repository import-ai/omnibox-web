import * as z from 'zod';
import { useState } from 'react';
import { http } from '@/utils/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { toDefaultNamespace, createNamespace } from '@/utils/namespace';
import {
  Form,
  FormItem,
  FormField,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

const registerSchema = z
  .object({
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
      .min(8, '密码至少8个字符')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
    password_repeat: z.string(),
  })
  .refine((data) => data.password === data.password_repeat, {
    message: '两次输入的密码不一致',
    path: ['password_repeat'],
  });

type TRegisterForm = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const form = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      password_repeat: '',
    },
  });
  const handleSubmit = (data: TRegisterForm) => {
    setIsLoading(true);
    http
      .post('register', data)
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="昵称" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="email"
                  placeholder="邮箱"
                  {...field}
                  disabled={isLoading}
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
              <FormControl>
                <Input
                  type="password"
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
        <div className="text-center text-sm">
          已有账号？
          <Link
            to="/user/login"
            className="font-semibold text-primary hover:underline ml-1"
          >
            登录
          </Link>
        </div>
      </form>
    </Form>
  );
}
