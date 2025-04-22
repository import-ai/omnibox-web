import * as z from 'zod';
import { useState } from 'react';
import { http } from '@/utils/request';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormField,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { toast } from 'sonner';

const registerSchema = z.object({
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
});

type TRegisterForm = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
    },
  });
  const handleSubmit = (data: TRegisterForm) => {
    setIsLoading(true);
    http
      .post('register', {
        email: data.email,
        url: `${location.origin}/user/register-comfirm`,
      })
      .then(() => {
        toast('请前往邮箱查看邮件，完成注册', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="email"
                  placeholder="邮箱"
                  autoComplete="email"
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
