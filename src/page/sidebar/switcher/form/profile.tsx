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
    .min(2, 'Username must be at least 2 characters')
    .max(32, 'Username must be at most 32 characters'),
  email: z
    .string()
    .email('Please enter a valid email address')
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
        message: 'Email must be from Gmail, Outlook, 163, or QQ',
      },
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
        message:
          'Password must contain uppercase, lowercase letters, and numbers',
      },
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
        toast.error('Passwords do not match', { position: 'top-center' });
        return;
      }
    }
    onChange(data, () => {
      toast.success('Profile updated successfully', { position: 'top-center' });
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
              <FormLabel>Username</FormLabel>
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormDescription>
                Only Gmail, Outlook, 163, and QQ emails are allowed
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
              <FormLabel>Password</FormLabel>
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
              <FormLabel>Confirm Password</FormLabel>
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
          Update Profile
        </Button>
      </form>
    </Form>
  );
}
