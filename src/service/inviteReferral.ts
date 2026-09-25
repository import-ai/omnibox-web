import { http } from '@/lib/request';

export type InviteSource = 'manual' | 'link' | 'qr_code';
export type InviteTaskCode =
  'phone_bound' | 'file_conversation_completed' | 'wechat_assistant_bound';

export interface InviteRegistrationResult {
  is_invited_new_user: true;
  requires_phone_binding: boolean;
  task_expires_at: string;
}

export interface InviteTask {
  task_code: InviteTaskCode;
  title: string;
  reward_text: string;
  status: 'completed' | 'pending';
  action: 'phone_binding' | 'home' | 'wechat_assistant_binding' | null;
}

export interface InviteRewardRule {
  task_code: InviteTaskCode;
  task_text: string;
  reward_text: string;
}

export interface InviteOverview {
  invite_code: string;
  invite_url: string | null;
  stats: {
    received_reward_days: number;
    qualified_invitee_count: number;
  };
  newcomer_tasks: {
    expires_at: string;
    remaining_days: number;
    items: InviteTask[];
  } | null;
  reward_rules: InviteRewardRule[];
  notes: string[];
}

export interface InviteRecord {
  id: string;
  invitee: {
    display_name: string;
    avatar_url: string | null;
  };
  task_code: InviteTaskCode;
  task_text: string;
  completed_at: string;
  reward_text: string;
  grant_status: 'granted';
}

export interface InviteRecordsPage {
  items: InviteRecord[];
  offset: number;
  limit: number;
  total: number;
}

export function validateInviteCode(inviteCode: string) {
  return http.post<{ valid: boolean }>(
    '/invite-referral/invite-code/validate',
    { invite_code: inviteCode },
    { mute: true }
  );
}

export function registerInviteReferral(
  inviteCode: string,
  source: InviteSource
) {
  return http.post<InviteRegistrationResult | null>(
    '/invite-referral/register',
    {
      invite_code: inviteCode,
      source,
    },
    { mute: true }
  );
}

export function fetchInviteOverview(signal?: AbortSignal) {
  return http.get<InviteOverview>('/invite-referral/overview', {
    signal,
    mute: true,
  });
}

export function fetchInviteRecords(
  offset = 0,
  limit = 20,
  signal?: AbortSignal
) {
  return http.get<InviteRecordsPage>(
    `/invite-referral/records?offset=${offset}&limit=${limit}`,
    {
      signal,
      mute: true,
    }
  );
}
