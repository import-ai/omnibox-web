import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';

import { Button } from '@/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const FormSchema = z.object({
  code: z.string().length(6, i18next.t('email.code_limit')),
});

type FormValues = z.infer<typeof FormSchema>;

interface IProps {
  onFinish: (code: string) => void;
}

export default function EmailValidate(props: IProps) {
  const { onFinish } = props;
  const { t } = useTranslation();
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      code: '',
    },
  });
  const handleSubmit = (data: FormValues) => {
    onFinish(data.code);
  };

  return (
    <Form {...form}>
      <form
        className="space-y-4 px-px"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('email.code')}</FormLabel>
              <FormControl>
                <Input autoComplete="text" {...field} />
              </FormControl>
              <FormDescription>{t('email.code_limit')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{t('ok')}</Button>
      </form>
    </Form>
  );
}
