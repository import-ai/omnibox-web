import { track } from '@/lib/sendTrackEvent';

import {
  inviteReferralPageEntry,
  inviteReferralTaskModule,
  trackInviteReferralHomeEntryClick,
  trackInviteReferralInviteNowClick,
  trackInviteReferralPageView,
  trackInviteReferralShareCloseClick,
  trackInviteReferralShareCopyClick,
  trackInviteReferralTaskClick,
} from './tracking';

jest.mock('@/lib/sendTrackEvent', () => ({ track: jest.fn() }));

const mockedTrack = jest.mocked(track);

beforeEach(() => {
  mockedTrack.mockClear();
});

test('counts the post-registration popup as an activation page view', () => {
  expect(inviteReferralPageEntry('activation')).toBe('activation');
  expect(inviteReferralPageEntry(null)).toBe('direct');
  expect(inviteReferralPageEntry('sidebar')).toBe('direct');
});

test('separates newcomer gift tasks from invite tasks', () => {
  expect(inviteReferralTaskModule('activation')).toBe('gift');
  expect(inviteReferralTaskModule('invitee')).toBe('tasks');
  expect(inviteReferralTaskModule(undefined)).toBe('tasks');
});

test('emits one page view for each visit, including activation', () => {
  trackInviteReferralPageView('activation');
  trackInviteReferralPageView(null);

  expect(mockedTrack).toHaveBeenNthCalledWith(1, 'invite_referral_page_view', {
    entry: 'activation',
    platform: 'web',
  });
  expect(mockedTrack).toHaveBeenNthCalledWith(2, 'invite_referral_page_view', {
    entry: 'direct',
    platform: 'web',
  });
});

test('emits distinct click events for the home entry, tasks, invite, copy, and close', () => {
  trackInviteReferralHomeEntryClick();
  trackInviteReferralTaskClick('activation', 'phone_bound');
  trackInviteReferralTaskClick(undefined, 'file_conversation_completed');
  trackInviteReferralInviteNowClick();
  trackInviteReferralShareCopyClick('code');
  trackInviteReferralShareCopyClick('link');
  trackInviteReferralShareCloseClick();

  expect(mockedTrack.mock.calls).toEqual([
    ['invite_referral_home_entry_click', { platform: 'web' }],
    [
      'invite_referral_task_click',
      { platform: 'web', task_code: 'phone_bound', task_module: 'gift' },
    ],
    [
      'invite_referral_task_click',
      {
        platform: 'web',
        task_code: 'file_conversation_completed',
        task_module: 'tasks',
      },
    ],
    [
      'invite_referral_invite_now_click',
      { placement: 'page', platform: 'web' },
    ],
    ['invite_referral_share_copy_click', { platform: 'web', target: 'code' }],
    ['invite_referral_share_copy_click', { platform: 'web', target: 'link' }],
    ['invite_referral_share_close_click', { platform: 'web' }],
  ]);
});
