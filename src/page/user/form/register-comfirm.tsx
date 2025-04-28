import * as z from 'zod';
import { useState } from 'react';
import { http } from '@/lib/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { initNamespace, createNamespace } from '@/lib/namespace';
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
      .min(2, 'Username must be at least 2 characters')
      .max(32, 'Username must be at most 32 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase letters, and numbers',
      ),
    password_repeat: z.string(),
  })
  .refine((data) => data.password === data.password_repeat, {
    message: 'Passwords do not match',
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
      .post('sign-up/confirm', { ...data, token })
      .then((response) => {
        localStorage.setItem('uid', response.id);
        localStorage.setItem('token', response.access_token);
        createNamespace(`${response.username}'s Namespace`).then(() => {
          initNamespace().then((returnValue) => {
            if (returnValue) {
              navigate('/', { replace: true });
            } else {
              navigate('/user/login', { replace: true });
            }
          });
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (!token) {
    return (
      <div className="text-center text-sm">
        <p>Invalid request parameters</p>
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
                <Input placeholder="Username" {...field} disabled={isLoading} />
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
                  placeholder="Password"
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
                  placeholder="Confirm Password"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" loading={isLoading}>
          Register
        </Button>
      </form>
    </Form>
  );
}
