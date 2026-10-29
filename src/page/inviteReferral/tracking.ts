import { track } from '@/lib/sendTrackEvent';

const platform = 'web';

export function inviteReferralPageEntry(entry: string | null) {
  return entry === 'activation' ? 'activation' : 'direct';
}

export function inviteReferralTaskModule(audience: string | undefined) {
  return audience === 'activation' ? 'gift' : 'tasks';
}

export function trackInviteReferralPageView(entry: string | null) {
  void track('invite_referral_page_view', {
    entry: inviteReferralPageEntry(entry),
    platform,
  });
}

export function trackInviteReferralHomeEntryClick() {
  void track('invite_referral_home_entry_click', { platform });
}

export function trackInviteReferralTaskClick(
  audience: string | undefined,
  taskCode: string
) {
  void track('invite_referral_task_click', {
    platform,
    task_code: taskCode,
    task_module: inviteReferralTaskModule(audience),
  });
}

export function trackInviteReferralInviteNowClick() {
  void track('invite_referral_invite_now_click', { platform });
}

export function trackInviteReferralShareCopyClick(target: 'code' | 'link') {
  void track('invite_referral_share_copy_click', { platform, target });
}

export function trackInviteReferralShareCloseClick() {
  void track('invite_referral_share_close_click', {
    platform,
    via: 'button',
  });
}
