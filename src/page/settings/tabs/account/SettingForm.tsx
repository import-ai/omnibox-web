import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/Button';
import { ConfirmInputDialog } from '@/components/confirm-input-dialog';
import { Input } from '@/components/input';
import Loading from '@/components/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
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
} from '@/components/ui/Form';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import useNamespace from '@/hooks/useNamespace';
import useNamespaces from '@/hooks/useNamespaces';
import { isEmoji } from '@/lib/emoji';
import { http } from '@/lib/request';

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .min(2, t('namespace.min'))
      .max(64, t('namespace.max'))
      .refine(
        value => {
          return !Array.from(value).some(char => isEmoji(char));
        },
        {
          message: t('namespace.no_special_chars'),
        }
      ),
  });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [submiting, onSubmiting] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { app, data, onChange, loading } = useNamespace();
  const { data: namespaces } = useNamespaces();
  const formSchema = useMemo(
    () => createFormSchema(t),
    [t, i18n.resolvedLanguage]
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
        setNameDialogOpen(false);
      })
      .catch(() => {
        // Keep the dialog open so the user can correct or retry the name.
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

  if (loading && !data.id) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      {/* Namespace Name Form - Owner and Admin */}
      {userIsOwnerOrAdmin && (
        <div>
          <h3 className="text-base font-semibold">{t('namespace.title')}</h3>
          <Separator className="my-2 border-t" />
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-sm font-medium leading-5 text-foreground">
                  {t('namespace.name')}
                </p>
                <p className="min-w-0 break-words text-sm font-normal leading-5 text-muted-foreground">
                  {data.name}
                </p>
              </div>
              <p className="whitespace-normal text-xs leading-4 text-muted-foreground">
                {t('namespace.name_description')}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                form.reset({ name: data.name });
                setNameDialogOpen(true);
              }}
            >
              {t('setting.change')}
            </Button>
          </div>
          <Dialog
            open={nameDialogOpen}
            onOpenChange={open => {
              if (!submiting) setNameDialogOpen(open);
            }}
          >
            <DialogContent className="w-[90%] max-w-md sm:max-w-md sm:w-1/2">
              <DialogHeader>
                <DialogTitle>{t('namespace.name')}</DialogTitle>
                <DialogDescription>
                  {t('namespace.name_description')}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">
                          {t('namespace.name')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} disabled={submiting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submiting}
                      onClick={() => setNameDialogOpen(false)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={submiting}
                      loading={submiting}
                    >
                      {t('namespace.submit')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {/* Danger Zone */}
      <div>
        <h3 className="text-base font-semibold text-destructive">
          {t('setting.danger_zone')}
        </h3>
        <Separator className="my-2 border-t" />
        <div className="flex flex-col gap-2">
          {/* Leave Space */}
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5 text-foreground">
                {t('namespace.leave.title')}
              </p>
              <p className="whitespace-normal text-xs leading-4 text-muted-foreground">
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
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-5 text-foreground">
                  {t('namespace.delete.title')}
                </p>
                <p className="whitespace-normal text-xs leading-4 text-muted-foreground">
                  {t('namespace.delete.description')}
                </p>
              </div>
              <Button
                variant="destructive"
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
        <AlertDialogContent className="max-w-md sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('namespace.leave.confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('namespace.leave.confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cancel-btn-outline"
              disabled={leaving}
            >
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={leaving}
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
