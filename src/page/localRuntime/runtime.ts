import { http } from '@/lib/request';

export interface LocalDevice {
  id: string;
  name: string;
  platform: string;
  shell: string;
  command_policy: string;
  online: boolean;
  paused: boolean;
  last_seen_at: string | null;
  revoked_at: string | null;
}
export interface LocalExecution {
  approvals: { decision: string; user_id: string; at: string }[];
  id: string;
  device_id: string;
  conversation_id: string;
  tool_call_id: string;
  namespace_id: string;
  command: string;
  cwd: string;
  timeout_seconds: number;
  status: string;
  approved_at: string | null;
  approval_expires_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  exit_code: number | null;
}
export interface ExecutionEvent {
  sequence: number;
  kind: string;
  data: string;
}
export const terminal = new Set([
  'succeeded',
  'failed',
  'denied',
  'canceled',
  'timed_out',
  'unknown',
]);
export function mergeEvents(
  current: ExecutionEvent[],
  incoming: ExecutionEvent[]
) {
  const map = new Map(current.map(e => [e.sequence, e]));
  for (const e of incoming) map.set(e.sequence, e);
  return [...map.values()].sort((a, b) => a.sequence - b.sequence);
}
export const runtimeApi = {
  devices: () => http.get<LocalDevice[]>('/local-devices', { mute: true }),
  executions: (conversationId?: string, offset = 0) =>
    http.get<LocalExecution[]>('/local-executions', {
      params: { conversation_id: conversationId, offset },
      mute: true,
    }),
  events: (id: string, after: number) =>
    http.get<ExecutionEvent[]>(`/local-executions/${id}/events`, {
      params: { after },
      mute: true,
    }),
  decide: (id: string, decision: 'approve' | 'reject') =>
    http.post(`/local-executions/${id}/decision`, { decision }),
  cancel: (id: string) => http.post(`/local-executions/${id}/cancel`),
};
