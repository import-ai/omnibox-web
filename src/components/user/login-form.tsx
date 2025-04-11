import { z } from 'zod';
import { cn } from '@/lib/utils';
import { http } from '@/utils/request';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock } from 'lucide-react';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormField,
  FormMessage,
  FormControl,
  FormDescription,
} from '@/components/ui/form';

const formSchema = z.object({
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
});

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'>) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    http
      .post('/api/auth', data)
      .then((response) => {
        localStorage.setItem('token', response.access_token);
        navigate('/test', { replace: true });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('flex flex-col gap-6', className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="email"
                    startIcon={Mail}
                    disabled={isLoading}
                    placeholder="Please enter your email address"
                    {...field}
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
                    startIcon={Lock}
                    disabled={isLoading}
                    placeholder="Password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" loading={isLoading}>
            Login
          </Button>
        </div>
        <div className="text-center text-sm">
          Don&apos;t have an account?
          <Link to="/user/register" className="text-sm text-blue-700 ml-1">
            Sign up
          </Link>
        </div>
      </form>
    </Form>
  );
}
