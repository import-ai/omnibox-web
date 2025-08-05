import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { t } from 'i18next';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

export interface PasswordProps {
  disabled?: boolean;
  passwordEnabled: boolean;
  onSave?: (password: string | null) => void;
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, t('form.password_min'))
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('form.password_reg')),
    password_repeat: z.string(),
  })
  .refine((data) => data.password === data.password_repeat, {
    message: t('form.password_not_match'),
    path: ['password_repeat'],
  });

type TPasswordForm = z.infer<typeof passwordSchema>;

export function Password(props: PasswordProps) {
  const { disabled, passwordEnabled, onSave } = props;
  const [open, setOpen] = useState<boolean>(false);
  const form = useForm<TPasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      password_repeat: '',
    },
  });

  const handleSave = (data: TPasswordForm) => {
    if (onSave) {
      onSave(data.password);
    }
    setOpen(false);
  };

  const handleChecked = (checked: boolean) => {
    if (checked) {
      setOpen(true);
    } else if (onSave) {
      onSave(null);
    }
  };
  return (
    <>
      <Switch
        checked={passwordEnabled}
        disabled={disabled}
        onCheckedChange={handleChecked}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Password</DialogTitle>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('form.password')}
                        {...field}
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
                        placeholder={t('form.confirm_password')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full disabled:opacity-60">
                Save
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
