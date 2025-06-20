import * as z from 'zod';
import { useState } from 'react';
import { http } from '@/lib/request';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
  FormControl,
} from '@/components/ui/form';
import { Group } from '@/interface';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FormSchema = z.object({
  groupId: z.string(),
});

type FormValues = z.infer<typeof FormSchema>;

interface IProps {
  namespaceId: string;
  groups: Array<Group>;
  onFinish: () => void;
}

export function AddGroupInvitationForm(props: IProps) {
  const { namespaceId, groups, onFinish } = props;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {},
  });
  const handleSubmit = (val: FormValues) => {
    setLoading(true);
    http
      .post(`/namespaces/${namespaceId}/invitations`, {
        groupId: val.groupId,
      })
      .then(() => {
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
          name="groupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('manage.group_name')}</FormLabel>
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
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} loading={loading}>
          {t('manage.submit')}
        </Button>
      </form>
    </Form>
  );
}
