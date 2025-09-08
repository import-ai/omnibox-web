import { zodResolver } from '@hookform/resolvers/zod';
import { t } from 'i18next';
import { useForm } from 'react-hook-form';
import z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export interface PasswordProps {
  passwordFailed?: boolean;
  loading?: boolean;
  onPassword: (password: string) => void;
}

const passwordSchema = z.object({
  password: z.string().nonempty(),
});

type TPasswordForm = z.infer<typeof passwordSchema>;

export function Password(props: PasswordProps) {
  const { passwordFailed, loading, onPassword } = props;

  const form = useForm<TPasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
    },
  });

  const handleSubmit = (data: TPasswordForm) => {
    onPassword(data.password);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="password"
                  placeholder={t('form.password')}
                  {...field}
                />
              </FormControl>
              {passwordFailed && (
                <FormMessage>
                  {t('shared_resources.incorrect_password')}
                </FormMessage>
              )}
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={loading}
          className="w-full disabled:opacity-60"
        >
          {t('shared_resources.submit')}
        </Button>
      </form>
    </Form>
  );
}
