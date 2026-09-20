import { ChevronLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/button';
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
  const navigate = useNavigate();
  const { namespace_id: namespaceId = '' } = useParams();
  const [overview, setOverview] = useState<InviteOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'activity' | 'records'>(
    'activity'
  );
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
      app.fire('open_settings', { tab: 'profile' });
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

  const showRecords = isMobile && mobileView === 'records';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#262626]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#F2F2F7] px-6 dark:border-border">
        {showRecords ? (
          <button
            type="button"
            className="flex items-center gap-1 text-sm"
            onClick={() => setMobileView('activity')}
          >
            <ChevronLeft className="size-4" />
            {t('inviteReferral.records.title')}
          </button>
        ) : (
          <h1 className="text-sm font-medium">{t('inviteReferral.title')}</h1>
        )}
        {isMobile && !showRecords ? (
          <button
            type="button"
            className="text-sm"
            onClick={() => setMobileView('records')}
          >
            {t('inviteReferral.records.subtitle')}
          </button>
        ) : null}
      </header>

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
