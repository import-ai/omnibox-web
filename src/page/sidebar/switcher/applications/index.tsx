import { CircleHelp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useApplications from '@/hooks/use-applications';
import { Application } from '@/interface';

import { AlreadyBoundDialog } from './already-bound-dialog';
import { BindDialog } from './bind-dialog';

type ApplicationState = 'unbound' | 'binding_in_progress' | 'bound';

function getLocalizedAppName(appId: string, t: any): string {
  const appName = t(`applications.app_names.${appId}`, { defaultValue: '' });
  if (!appName) {
    throw new Error(t('applications.unsupported_app', { app_id: appId }));
  }
  return appName;
}

function validateAppId(appId: string): void {
  if (appId !== 'wechat_bot' && appId !== 'qq_bot') {
    throw new Error(`Unsupported application type: ${appId}`);
  }
}

function getApplicationState(application: Application): ApplicationState {
  if (!application.id) {
    return 'unbound';
  }

  if (application.attrs?.verify_code && !application.api_key_id) {
    return 'binding_in_progress';
  }

  if (application.api_key_id) {
    return 'bound';
  }

  return 'unbound';
}

interface ApplicationsFormProps {
  autoAction?: {
    type: 'bind';
    appId: string;
  };
}

export function ApplicationsForm({ autoAction }: ApplicationsFormProps) {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id || '';

  const {
    applications,
    loading,
    bindApplication,
    unbindApplication,
    checkApplicationStatus,
    refetch,
  } = useApplications(namespaceId);

  const [bindingLoading, setBindingLoading] = useState(false);
  const [unbindingLoading, setUnbindingLoading] = useState(false);
  const [cancelingLoading, setCancelingLoading] = useState(false);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [alreadyBoundDialogOpen, setAlreadyBoundDialogOpen] = useState(false);
  const [bindingCode, setBindingCode] = useState('');
  const [currentAppId, setCurrentAppId] = useState<string>('');
  const [currentBindingApplication, setCurrentBindingApplication] =
    useState<Application | null>(null);

  // Track if autoAction has been processed to prevent re-triggering
  const autoActionProcessedRef = useRef(false);

  const handleBind = async (application: Application) => {
    try {
      setBindingLoading(true);
      setCurrentAppId(application.app_id);

      // Check if already bound
      const state = getApplicationState(application);
      if (state === 'bound') {
        setAlreadyBoundDialogOpen(true);
        return;
      }

      // Check if there's already a verify_code in progress
      if (application.attrs?.verify_code) {
        // Use existing verify_code
        setBindingCode(application.attrs.verify_code);
        setCurrentBindingApplication(application);
        setBindDialogOpen(true);
        toast.success(t('applications.bind.continue'));
      } else {
        // Start new binding process
        const response = await bindApplication(application.app_id);
        setBindingCode(response.attrs?.verify_code!);
        setCurrentBindingApplication(response);
        setBindDialogOpen(true);
        toast.success(t('applications.bind.initiated'));
      }
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

  const handleBindingComplete = async () => {
    setBindDialogOpen(false);
    setCurrentBindingApplication(null);
    setBindingCode('');
    setCurrentAppId('');
    await refetch();
    toast.success(t('applications.bind.success'));
  };

  const handleCancelBind = async (application: Application) => {
    try {
      setCancelingLoading(true);
      await unbindApplication(application.id);
      toast.success(t('applications.bind.cancel.success'));
    } catch (error: any) {
      toast.error(error.message || t('applications.unbind.error'));
    } finally {
      setCancelingLoading(false);
    }
  };

  const handleDocsClick = (appId: string) => {
    const isZh = i18n.language.startsWith('zh');
    const url = isZh
      ? `/docs/zh-cn/${appId.replace('_', '-')}`
      : `/docs/${appId.replace('_', '-')}`;
    window.open(url, '_blank');
  };

  // Reset the processed flag when autoAction changes
  useEffect(() => {
    autoActionProcessedRef.current = false;
  }, [autoAction]);

  // Auto-trigger binding when autoAction is provided (only once)
  useEffect(() => {
    if (
      autoAction &&
      autoAction.type === 'bind' &&
      !loading &&
      applications.length > 0 &&
      !autoActionProcessedRef.current
    ) {
      const targetApp = applications.find(
        app => app.app_id === autoAction.appId
      );
      if (targetApp) {
        autoActionProcessedRef.current = true;
        handleBind(targetApp);
      }
    }
  }, [autoAction, loading, applications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2.5">
          <h3 className="text-base font-semibold text-foreground">
            {t('applications.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('applications.description')}
          </p>
        </div>

        <Separator className="my-6" />

        {applications.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t('applications.empty')}
            </p>
          </div>
        ) : (
          applications.map((application: Application) => {
            const state = getApplicationState(application);

            let appDisplayName: string;
            let hasError = false;

            try {
              validateAppId(application.app_id);
              appDisplayName = getLocalizedAppName(application.app_id, t);
            } catch {
              appDisplayName = application.app_id;
              hasError = true;
            }

            return (
              <div
                key={application.app_id}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-1">
                  <span className="text-base font-semibold text-foreground">
                    {appDisplayName}
                  </span>
                  {!hasError && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleDocsClick(application.app_id)}
                          className="flex items-center justify-center transition-opacity hover:opacity-70"
                        >
                          <CircleHelp className="size-5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t('footer.docs')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {hasError && (
                    <Badge variant="destructive" className="ml-2 text-red-600">
                      {t('applications.unsupported_app', {
                        app_id: application.app_id,
                      })}
                    </Badge>
                  )}
                </div>

                {hasError ? (
                  <Button
                    disabled
                    variant="outline"
                    size="sm"
                    className="text-sm font-semibold"
                  >
                    {t('applications.unbind.button')}
                  </Button>
                ) : state === 'bound' ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-sm font-semibold dark:bg-destructive dark:text-destructive-foreground dark:border-destructive dark:hover:bg-destructive/90"
                      >
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
                            name: appDisplayName,
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
                          {unbindingLoading && <Spinner className="mr-2" />}
                          {t('applications.unbind.confirm.button')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : state === 'binding_in_progress' ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleBind(application)}
                      disabled={bindingLoading}
                      size="sm"
                      className="text-sm font-semibold"
                    >
                      {bindingLoading && <Spinner className="mr-2" />}
                      {t('applications.bind.continue_button')}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive dark:bg-destructive dark:text-destructive-foreground dark:border-destructive dark:hover:bg-destructive/90"
                        >
                          {t('applications.bind.cancel_button')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('applications.bind.cancel.confirm.title')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('applications.bind.cancel.confirm.description', {
                              name: appDisplayName,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={cancelingLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleCancelBind(application)}
                          >
                            {cancelingLoading && <Spinner className="mr-2" />}
                            {t('applications.bind.cancel.confirm.button')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleBind(application)}
                    disabled={bindingLoading}
                    size="sm"
                    className="text-sm font-semibold"
                  >
                    {bindingLoading && <Spinner className="mr-2" />}
                    {t('applications.bind.button')}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      <BindDialog
        open={bindDialogOpen}
        onOpenChange={setBindDialogOpen}
        bindingCode={bindingCode}
        applicationId={currentBindingApplication?.id || ''}
        appId={currentAppId}
        checkApplicationStatus={checkApplicationStatus}
        onBindingComplete={handleBindingComplete}
      />

      <AlreadyBoundDialog
        open={alreadyBoundDialogOpen}
        onOpenChange={setAlreadyBoundDialogOpen}
        appId={currentAppId}
      />
    </>
  );
}
