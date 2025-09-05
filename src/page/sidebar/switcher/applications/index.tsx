import { Link, LoaderCircle, Unlink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import useApplications from '@/hooks/use-applications';
import { Application } from '@/interface';

import { BindDialog } from './bind-dialog';

export function ApplicationsForm() {
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id || '';

  const { applications, loading, bindApplication, unbindApplication } =
    useApplications(namespaceId);

  const [bindingLoading, setBindingLoading] = useState(false);
  const [unbindingLoading, setUnbindingLoading] = useState(false);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [bindingCode, setBindingCode] = useState('');

  const handleBind = async (application: Application) => {
    try {
      setBindingLoading(true);
      const response = await bindApplication(application.app_id);
      setBindingCode(response.attrs.verify_code);
      setBindDialogOpen(true);
      toast.success(t('applications.bind.initiated'));
    } catch (error: any) {
      toast.error(error.message || t('applications.bind.error'));
    } finally {
      setBindingLoading(false);
    }
  };

  const handleUnbind = async (application: Application) => {
    try {
      setUnbindingLoading(true);
      await unbindApplication(application.id);
      toast.success(t('applications.unbind.success'));
    } catch (error: any) {
      toast.error(error.message || t('applications.unbind.error'));
    } finally {
      setUnbindingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoaderCircle className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col mb-4 gap-2">
          <h2 className="font-medium">{t('applications.title')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('applications.description')}
          </p>
        </div>
        <Separator className="mb-4" />

        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">{t('applications.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          applications.map((application: Application) => (
            <Card key={application.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{application.app_id}</h4>
                      {application.id ? (
                        <Badge variant="secondary" className="text-green-600">
                          <Link className="size-3 mr-1" />
                          {t('applications.status.bound')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-red-600">
                          <Unlink className="size-3 mr-1" />
                          {t('applications.status.unbound')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {application.id ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          {t('applications.unbind.button')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('applications.unbind.confirm.title')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('applications.unbind.confirm.description', {
                              name: application.app_id,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={unbindingLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleUnbind(application)}
                          >
                            {unbindingLoading && (
                              <LoaderCircle className="size-4 mr-2 animate-spin" />
                            )}
                            {t('applications.unbind.confirm.button')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleBind(application)}
                      disabled={bindingLoading}
                    >
                      {bindingLoading && (
                        <LoaderCircle className="size-4 mr-2 animate-spin" />
                      )}
                      {t('applications.bind.button')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BindDialog
        open={bindDialogOpen}
        onOpenChange={setBindDialogOpen}
        bindingCode={bindingCode}
      />
    </>
  );
}
