import { CircleHelp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/Button';
import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
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
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import useApplications from '@/hooks/useApplications';
import { Application } from '@/interface';
import { getDocsLink } from '@/lib/getDocsLink.ts';
import { cn } from '@/lib/utils';
import { useSettingsToast } from '@/page/settings/SettingsToastProvider';

import { AlreadyBoundDialog } from './AlreadyBoundDialog';
import { beginCodeBind } from './beginCodeBind';
import { beginQrCodeBind, WECHAT_OA_APP_ID } from './beginQrCodeBind';
import { BindDialog } from './BindDialog';
import { QRCodeBindDialog } from './QRCodeBindDialog';

type ApplicationState = 'unbound' | 'binding_in_progress' | 'bound';

function getLocalizedAppName(appId: string, t: any): string {
  const appName = t(`applications.app_names.${appId}`, { defaultValue: '' });
  if (!appName) {
    throw new Error(t('applications.unsupported_app', { app_id: appId }));
  }
  return appName;
}

function validateAppId(appId: string): void {
  if (
    appId !== 'wechat_bot' &&
    appId !== 'qq_bot' &&
    appId !== 'telegram_bot' &&
    appId !== 'wechat_clawbot' &&
    appId !== WECHAT_OA_APP_ID
  ) {
    throw new Error(`Unsupported application type: ${appId}`);
  }
}

function getConfirmAppName(
  application: Application,
  t: (key: string, options?: Record<string, string>) => string
) {
  try {
    validateAppId(application.app_id);
    return getLocalizedAppName(application.app_id, t);
  } catch {
    return application.app_id;
  }
}

function getApplicationState(application: Application): ApplicationState {
  if (!application.id) {
    return 'unbound';
  }

  if (application.attrs?.key && !application.api_key_id) {
    return 'binding_in_progress';
  }

  if (application.api_key_id) {
    return 'bound';
  }

  return 'unbound';
}

// Check if app uses QR code binding (wechat_clawbot)
function isQRCodeBinding(appId: string): boolean {
  return appId === 'wechat_clawbot';
}

// Apps without a docs page
function hasDocs(appId: string): boolean {
  return appId !== 'telegram_bot' && appId !== WECHAT_OA_APP_ID;
}

interface ApplicationsFormProps {
  autoAction?: {
    type: 'bind';
    appId: string;
  };
}

export function ApplicationsForm({ autoAction }: ApplicationsFormProps) {
  const { showToast } = useSettingsToast();
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
  const [qrBindDialogOpen, setQrBindDialogOpen] = useState(false);
  const [alreadyBoundDialogOpen, setAlreadyBoundDialogOpen] = useState(false);
  const [bindingCode, setBindingCode] = useState('');
  const [qrcodeContent, setQrcodeContent] = useState('');
  const [currentAppId, setCurrentAppId] = useState<string>('');
  const [currentBindingApplication, setCurrentBindingApplication] =
    useState<Application | null>(null);
  const [confirmApplication, setConfirmApplication] =
    useState<Application | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    'unbind' | 'cancel' | null
  >(null);

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

      if (application.app_id === WECHAT_OA_APP_ID) {
        const result = await beginQrCodeBind(
          application,
          bindApplication,
          unbindApplication
        );
        if (result.status === 'already_bound') {
          setAlreadyBoundDialogOpen(true);
          return;
        }
        setQrcodeContent(result.qrcodeContent);
        setCurrentBindingApplication(result.application);
        setQrBindDialogOpen(true);
        showToast(
          t(
            result.resumed
              ? 'applications.bind.continue'
              : 'applications.bind.initiated'
          ),
          'success'
        );
        return;
      }

      // Handle QR code binding (wechat_clawbot)
      if (isQRCodeBinding(application.app_id)) {
        // Check if there's already a session_key in progress
        if (
          application.attrs?.session_key &&
          application.attrs?.qrcode_content
        ) {
          // Use existing qrcode content
          setQrcodeContent(application.attrs.qrcode_content);
          setCurrentBindingApplication(application);
          setQrBindDialogOpen(true);
          showToast(t('applications.bind.continue'), 'success');
        } else {
          // Start new binding process
          const response = await bindApplication(application.app_id);
          setQrcodeContent(response.attrs?.qrcode_content || '');
          setCurrentBindingApplication(response);
          setQrBindDialogOpen(true);
          showToast(t('applications.bind.initiated'), 'success');
        }
        return;
      }

      // Handle code-based binding (wechat_bot, qq_bot)
      const result = await beginCodeBind(application, bindApplication);
      if (result.status === 'already_bound') {
        setAlreadyBoundDialogOpen(true);
        return;
      }
      setBindingCode(result.code);
      setCurrentBindingApplication(result.application);
      setBindDialogOpen(true);
      showToast(
        t(
          result.resumed
            ? 'applications.bind.continue'
            : 'applications.bind.initiated'
        ),
        'success'
      );
    } catch {
      showToast(t('applications.bind.error'), 'error');
    } finally {
      setBindingLoading(false);
    }
  };

  const handleUnbind = async (application: Application) => {
    try {
      setUnbindingLoading(true);
      await unbindApplication(application.id);
      setConfirmApplication(null);
      setConfirmAction(null);
      showToast(t('applications.unbind.success'), 'success');
    } catch {
      showToast(t('applications.unbind.error'), 'error');
    } finally {
      setUnbindingLoading(false);
    }
  };

  const handleBindingComplete = async () => {
    setBindDialogOpen(false);
    setQrBindDialogOpen(false);
    setCurrentBindingApplication(null);
    setBindingCode('');
    setQrcodeContent('');
    setCurrentAppId('');
    await refetch();
    showToast(t('applications.bind.success'), 'success');
  };

  const handleCancelBind = async (application: Application) => {
    try {
      setCancelingLoading(true);
      await unbindApplication(application.id);
      setConfirmApplication(null);
      setConfirmAction(null);
      showToast(t('applications.bind.cancel.success'), 'success');
    } catch {
      showToast(t('applications.unbind.error'), 'error');
    } finally {
      setCancelingLoading(false);
    }
  };

  const handleDocsClick = (appId: string) => {
    const url = getDocsLink(`/applications/${appId}`, i18n.language)
      .replace('_bot', '-assistant')
      .replace('_clawbot', '-clawbot');
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
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
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
            const isBound = state === 'bound';

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
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-medium leading-5 text-foreground">
                      {appDisplayName}
                    </span>
                    {!hasError && hasDocs(application.app_id) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleDocsClick(application.app_id)}
                            className={cn(
                              sidebarToolbarIconButtonClassName,
                              'self-center hover:bg-transparent'
                            )}
                          >
                            <CircleHelp className="size-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {t('footer.docs')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!hasError && (
                      <span className="min-w-0 break-words text-sm font-normal leading-5 text-muted-foreground">
                        {t(`applications.status.${state}`)}
                      </span>
                    )}
                    {hasError && (
                      <span className="min-w-0 break-words text-sm font-normal leading-5 text-muted-foreground">
                        {t('applications.unsupported_app', {
                          app_id: application.app_id,
                        })}
                      </span>
                    )}
                  </div>
                  {!hasError && (
                    <p className="whitespace-normal text-xs leading-4 text-muted-foreground">
                      {t('applications.connection_description', {
                        platform: t(
                          `applications.scan_via.${application.app_id}`
                        ),
                      })}
                    </p>
                  )}
                </div>

                {hasError ? (
                  <SettingPageButton disabled variant="outline">
                    {t('applications.unbind.button')}
                  </SettingPageButton>
                ) : isBound ? (
                  <SettingPageButton
                    variant="outline"
                    onClick={() => {
                      setConfirmApplication(application);
                      setConfirmAction('unbind');
                    }}
                  >
                    {t('applications.unbind.button')}
                  </SettingPageButton>
                ) : state === 'binding_in_progress' ? (
                  <div className="flex gap-2">
                    <SettingPageButton
                      onClick={() => handleBind(application)}
                      disabled={
                        bindingLoading && currentAppId === application.app_id
                      }
                    >
                      {bindingLoading &&
                        currentAppId === application.app_id && (
                          <Spinner className="mr-2" />
                        )}
                      {t('applications.bind.button')}
                    </SettingPageButton>
                    <SettingPageButton
                      variant="outline"
                      onClick={() => {
                        setConfirmApplication(application);
                        setConfirmAction('cancel');
                      }}
                    >
                      {t('applications.bind.cancel_button')}
                    </SettingPageButton>
                  </div>
                ) : (
                  <SettingPageButton
                    onClick={() => handleBind(application)}
                    disabled={
                      bindingLoading && currentAppId === application.app_id
                    }
                  >
                    {bindingLoading && currentAppId === application.app_id && (
                      <Spinner className="mr-2" />
                    )}
                    {t('applications.bind.button')}
                  </SettingPageButton>
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
        urlLink={currentBindingApplication?.attrs?.url_link}
        applicationId={currentBindingApplication?.id || ''}
        appId={currentAppId}
        checkApplicationStatus={checkApplicationStatus}
        onBindingComplete={handleBindingComplete}
      />

      <QRCodeBindDialog
        open={qrBindDialogOpen}
        onOpenChange={setQrBindDialogOpen}
        qrcodeContent={qrcodeContent}
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
      <AlertDialog
        open={confirmApplication !== null}
        onOpenChange={open => {
          if (!open && !unbindingLoading && !cancelingLoading) {
            setConfirmApplication(null);
            setConfirmAction(null);
          }
        }}
      >
        <AlertDialogContent className="w-[85%] max-w-sm sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                confirmAction === 'cancel'
                  ? 'applications.bind.cancel.confirm.title'
                  : 'applications.unbind.confirm.title'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                confirmAction === 'cancel'
                  ? 'applications.bind.cancel.confirm.description'
                  : 'applications.unbind.confirm.description',
                {
                  name: confirmApplication
                    ? getConfirmAppName(confirmApplication, t)
                    : '',
                }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                disabled={unbindingLoading || cancelingLoading}
              >
                {t('cancel')}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={unbindingLoading || cancelingLoading}
              onClick={event => {
                event.preventDefault();
                if (!confirmApplication) return;
                if (confirmAction === 'cancel') {
                  void handleCancelBind(confirmApplication);
                  return;
                }
                void handleUnbind(confirmApplication);
              }}
            >
              {(unbindingLoading || cancelingLoading) && (
                <Spinner className="mr-2" />
              )}
              {t(
                confirmAction === 'cancel'
                  ? 'applications.bind.cancel.confirm.button'
                  : 'applications.unbind.confirm.button'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
