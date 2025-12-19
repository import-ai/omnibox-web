import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import Loading from '@/components/loading';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import useNamespace from '@/hooks/use-namespace';
import useNamespaces from '@/hooks/use-namespaces';
import { isEmoji } from '@/lib/emoji';
import { http } from '@/lib/request';

const FormSchema = z.object({
  name: z
    .string()
    .min(2, i18next.t('namespace.min'))
    .max(64, i18next.t('namespace.max'))
    .refine(
      value => {
        return !Array.from(value).some(char => isEmoji(char));
      },
      {
        message: i18next.t('namespace.no_special_chars'),
      }
    ),
});

type FormValues = z.infer<typeof FormSchema>;

interface SettingFormProps {
  namespaceId: string;
  userIsOwner: boolean;
  onClose?: () => void;
}

export default function SettingForm({
  namespaceId,
  userIsOwner,
  onClose,
}: SettingFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submiting, onSubmiting] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { app, data, onChange, loading } = useNamespace();
  const { data: namespaces } = useNamespaces();
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
    },
  });

  const handleSubmit = (data: FormValues) => {
    onSubmiting(true);
    onChange(data)
      .then(() => {
        app.fire('namespaces_refetch');
        toast(t('namespace.success'));
      })
      .finally(() => {
        onSubmiting(false);
      });
  };

  const handleLeave = async () => {
    const uid = localStorage.getItem('uid');
    if (!uid) return;

    setLeaving(true);
    try {
      await http.delete(`/namespaces/${namespaceId}/members/${uid}`);
      toast.success(t('namespace.leave.success'));
      app.fire('namespaces_refetch');
      onClose?.();
      // Navigate to another namespace if available
      const otherNamespace = namespaces?.find(ns => ns.id !== namespaceId);
      if (otherNamespace) {
        navigate(`/${otherNamespace.id}`);
      } else {
        navigate('/welcome');
      }
    } catch {
      // Error toast handled by request lib
    } finally {
      setLeaving(false);
      setLeaveDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await http.delete(`/namespaces/${namespaceId}`);
      toast.success(t('namespace.delete.success'));
      app.fire('namespaces_refetch');
      onClose?.();
      // Navigate to another namespace if available
      const otherNamespace = namespaces?.find(ns => ns.id !== namespaceId);
      if (otherNamespace) {
        navigate(`/${otherNamespace.id}`);
      } else {
        navigate('/welcome');
      }
    } catch {
      // Error toast handled by request lib
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    if (!data.id) {
      return;
    }
    form.setValue('name', data.name);
  }, [data]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      {/* Namespace Name Form - Owner only */}
      {userIsOwner && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 px-px"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('namespace.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={submiting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submiting}
                loading={submiting}
                className="h-[30px] w-[71px]"
              >
                {t('namespace.submit')}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Danger Zone */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-destructive mb-4">
          {t('setting.danger_zone')}
        </h3>
        <div className="space-y-4">
          {/* Leave Space */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {t('namespace.leave.title')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('namespace.leave.description')}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setLeaveDialogOpen(true)}
            >
              {t('namespace.leave.button')}
            </Button>
          </div>

          {/* Delete Space - Only for owners */}
          {userIsOwner && (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t('namespace.delete.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('namespace.delete.description')}
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteDialogOpen(true)}
              >
                {t('namespace.delete.button')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Leave Dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('namespace.leave.confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('namespace.leave.confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={leaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={e => {
                e.preventDefault();
                handleLeave();
              }}
            >
              {leaving && <Spinner className="mr-2" />}
              {t('namespace.leave.button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('namespace.delete.confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('namespace.delete.confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={e => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting && <Spinner className="mr-2" />}
              {t('namespace.delete.button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
