import { ChevronLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import { Button } from '@/components/button';
import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import { useSidebar } from '@/components/ui/Sidebar';
import { Skeleton } from '@/components/ui/Skeleton';
import useApp from '@/hooks/useApp';
import { useIsMobile } from '@/hooks/useMobile';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import {
  fetchInviteOverview,
  type InviteOverview,
  type InviteTask,
} from '@/service/inviteReferral';

import { InviteActivityPanel } from './InviteActivityPanel';
import { InvitePhoneBindingDialog } from './InvitePhoneBindingDialog';
import { InviteRecordsPanel } from './InviteRecordsPanel';
import { InviteShareDialog } from './InviteShareDialog';
import { clearInvitePhoneBinding, hasInvitePhoneBinding } from './registration';

export function InviteReferralContent() {
  const { t } = useTranslation();
  const app = useApp();
  const isMobile = useIsMobile();
  const { open: sidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { namespace_id: namespaceId = '' } = useParams();
  const [overview, setOverview] = useState<InviteOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [phoneBindingOpen, setPhoneBindingOpen] = useState(() =>
    hasInvitePhoneBinding()
  );

  const load = useCallback(async () => {
    setError(false);
    try {
      setOverview(await fetchInviteOverview());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissPhoneBinding = () => {
    clearInvitePhoneBinding();
    setPhoneBindingOpen(false);
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return app.on('close_settings', () => {
      void load();
    });
  }, [app, load]);

  const runTask = (task: InviteTask) => {
    if (task.status === 'completed') return;
    if (task.action === 'phone_binding') {
      app.fire('open_settings', {
        tab: 'profile',
        autoAction: { type: 'bind_phone' },
      });
      return;
    }
    if (task.action === 'wechat_assistant_binding') {
      app.fire('open_settings', {
        tab: 'applications',
        autoAction: { type: 'bind', appId: 'wechat_bot' },
      });
      return;
    }
    if (task.action === 'home') {
      navigateToResource(navigate, `/${namespaceId}/chat`);
    }
  };

  const showRecords = isMobile && searchParams.get('view') === 'records';

  const openRecords = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', 'records');
    setSearchParams(nextParams, {
      state: { ...location.state, fromInviteActivity: true },
    });
  };

  const closeRecords = () => {
    if (location.state?.fromInviteActivity) {
      navigate(-1);
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('view');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#262626]">
      {isMobile ? (
        <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#F2F2F7] px-3 dark:border-border">
          <div className="flex min-w-0 items-center">
            {showRecords ? (
              <button
                type="button"
                aria-label={t('login.back')}
                className="flex size-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={closeRecords}
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : (
              <SidebarTriggerButton collapse />
            )}
          </div>
          <h1 className="text-center text-[17px] font-medium">
            {t(
              showRecords
                ? 'inviteReferral.records.subtitle'
                : 'inviteReferral.title'
            )}
          </h1>
          <div className="flex min-w-0 justify-end">
            {!showRecords && (
              <button
                type="button"
                className="flex min-h-11 items-end pb-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={openRecords}
              >
                {t('inviteReferral.records.subtitle')}
              </button>
            )}
          </div>
        </header>
      ) : (
        <header className="flex h-12 min-w-0 shrink-0 items-center gap-2 border-b border-[#F2F2F7] dark:border-border">
          <div className="flex min-w-0 flex-1 items-center gap-1 px-3 sm:gap-2">
            <SidebarTriggerButton collapse />
            <div className={sidebarOpen ? 'min-w-0 ml-2' : 'min-w-0'}>
              <h1 className="text-sm font-medium">
                {t('inviteReferral.title')}
              </h1>
            </div>
          </div>
        </header>
      )}

      {loading ? (
        <div className="flex flex-1 gap-4 p-6">
          <Skeleton className="h-full w-full bg-muted md:w-[400px]" />
          <Skeleton className="hidden h-full flex-1 bg-muted md:block" />
        </div>
      ) : error || !overview ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
          <p className="text-center text-sm text-muted-foreground">
            {t('inviteReferral.loadFailed')}
          </p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            {t('inviteReferral.common.retry')}
          </Button>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden">
          {!showRecords ? (
            <div className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden md:w-[400px]">
              <InviteActivityPanel
                overview={overview}
                onInvite={() => setShareOpen(true)}
                onTask={runTask}
              />
            </div>
          ) : null}
          <div className="mt-[11px] hidden w-px shrink-0 bg-[#F2F2F7] dark:bg-border md:block" />
          {!isMobile || showRecords ? (
            <InviteRecordsPanel
              invitedCount={overview.stats.qualified_invitee_count}
            />
          ) : null}
        </div>
      )}

      {overview ? (
        <InviteShareDialog
          inviteCode={overview.invite_code}
          inviteUrl={overview.invite_url}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      ) : null}
      <InvitePhoneBindingDialog
        open={phoneBindingOpen}
        onBound={load}
        onOpenChange={open => {
          if (open) {
            setPhoneBindingOpen(true);
            return;
          }
          dismissPhoneBinding();
        }}
      />
    </div>
  );
}
