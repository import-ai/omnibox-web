import * as z from 'zod';
import { toast } from 'sonner';
import { useState } from 'react';
import { http } from '@/utils/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  FormItem,
  FormField,
  FormMessage,
  FormControl,
} from '@/components/ui/form';

const forgotPasswordSchema = z.object({
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
  password_repeat: z.string(),
});

type TForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<TForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      password: '',
      password_repeat: '',
    },
  });
  const onSubmit = (data: TForgotPasswordForm) => {
    setIsLoading(true);
    http
      .post('password-confirm', {
        token,
        password: data.password,
        password_repeat: data.password_repeat,
      })
      .then(() => {
        toast.success('密码重置成功');
        navigate('/user/login', { replace: true });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          loading={isLoading}
        >
          重置密码
        </Button>
      </form>
    </Form>
  );
}
