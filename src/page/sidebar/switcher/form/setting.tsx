import { zodResolver } from '@hookform/resolvers/zod';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/button';
import { ConfirmInputDialog } from '@/components/confirm-input-dialog';
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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import useConfig from '@/hooks/use-config';
import useNamespace from '@/hooks/use-namespace';
import useNamespaces from '@/hooks/use-namespaces';
import { isEmoji } from '@/lib/emoji';
import { http } from '@/lib/request';

import { RemainQuota } from '../quota';

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
  userIsOwnerOrAdmin: boolean;
  onClose?: () => void;
}

export default function SettingForm({
  namespaceId,
  userIsOwner,
  userIsOwnerOrAdmin,
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
  const { config } = useConfig();
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
      {/* Namespace Name Form - Owner and Admin */}
      {userIsOwnerOrAdmin && (
        <div>
          <h3 className="text-base font-semibold">{t('namespace.title')}</h3>
          <Separator className="border-t my-2" />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-row gap-2.5 items-center justify-between px-px w-full"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex gap-7 space-y-0 flex-row items-center w-full">
                    <FormLabel className="min-w-14">
                      {t('namespace.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={submiting}
                        className="rounded-md border-border bg-transparent dark:bg-transparent w-full mt-0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={submiting}
                loading={submiting}
                className="h-[30px] w-[71px]"
              >
                {t('namespace.submit')}
              </Button>
            </form>
          </Form>
        </div>
      )}
      {config.commercial && (
        <div>
          <h3 className="text-base font-semibold">{t('namespace.usage')}</h3>
          <Separator className="border-t my-2" />
          <RemainQuota namespaceId={namespaceId} />
        </div>
      )}
      {/* Danger Zone */}
      <div>
        <h3 className="text-base font-semibold text-destructive">
          {t('setting.danger_zone')}
        </h3>
        <Separator className="border-t my-2" />
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
      <ConfirmInputDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('namespace.delete.confirm_title')}
        warningTitle={t('namespace.delete.warning_title')}
        warningBody={t('namespace.delete.warning_body')}
        confirmText={data.name}
        confirmLabel={t('namespace.delete.confirm_label', { name: data.name })}
        confirmButtonText={t('namespace.delete.button')}
        cancelButtonText={t('cancel')}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
