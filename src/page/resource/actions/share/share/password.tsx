import { zodResolver } from '@hookform/resolvers/zod';
import { t } from 'i18next';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

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
import { passwordSchema } from '@/lib/validation-schemas';

export interface PasswordProps {
  disabled?: boolean;
  passwordEnabled: boolean;
  onSave?: (password: string | null) => void;
}

const passwordFormSchema = z
  .object({
    password: passwordSchema,
    password_repeat: z.string(),
  })
  .refine(data => data.password === data.password_repeat, {
    message: t('form.password_not_match'),
    path: ['password_repeat'],
  });

type TPasswordForm = z.infer<typeof passwordFormSchema>;

export function Password(props: PasswordProps) {
  const { disabled, passwordEnabled, onSave } = props;
  const [open, setOpen] = useState<boolean>(false);
  const form = useForm<TPasswordForm>({
    resolver: zodResolver(passwordFormSchema),
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
                {t('share.share.save')}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
