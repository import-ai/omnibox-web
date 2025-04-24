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
      }
    ),
  role: z
    .string()
    .min(2, 'At least 2 characters')
    .max(22, 'At most 22 characters'),
});

type FormValues = z.infer<typeof FormSchema>;

interface IProps {
  onFinish: () => void;
}

export default function InviteForm(props: IProps) {
  const { onFinish } = props;
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
    const namespaceId = namespace ? JSON.parse(namespace).id : '0';
    http
      .post('invite', {
        ...data,
        namespace: namespaceId,
        inviteUrl: `${location.origin}/user/invite/comfirm`,
        registerUrl: `${location.origin}/user/sign-up/comfirm`,
      })
      .then(() => {
        form.resetField('email');
        form.resetField('role');
        toast('Invitation sent');
        onFinish();
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
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
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
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
                    <SelectItem value="owner">Workspace Owner</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          Save
        </Button>
      </form>
    </Form>
  );
}
