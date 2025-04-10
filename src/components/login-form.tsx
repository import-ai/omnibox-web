import { z } from 'zod';
import React from 'react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { Mail, Lock } from 'lucide-react';
import { Input } from '@/components/input';
import { Button } from '@/components/ui/button';
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
  email: z.string().email(),
  password: z.string().min(5),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'>) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
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
                    placeholder="Password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Login
          </Button>
        </div>
        <div className="text-center text-sm">
          Don&apos;t have an account?
          <a href="/signup" className="text-sm text-blue-700 ml-1">
            Sign up
          </a>
        </div>
      </form>
    </Form>
  );
}
