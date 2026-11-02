import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import { http } from '@/lib/request';
import { getCurrentUserId } from '@/page/chat/conversation/conversationCache';
import { subscribeCredentials } from '@/page/user/util';

export interface LocalDevice {
  id: string;
  name: string;
  hostname?: string | null;
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
export interface LocalExecutionPage {
  items: LocalExecution[];
  total: number;
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
  executions: (
    conversationId?: string,
    offset = 0,
    limit = 100
  ): Promise<LocalExecutionPage> =>
    http.get<LocalExecutionPage>('/local-executions', {
      params: { conversation_id: conversationId, offset, limit },
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

export function useRuntimeUserId() {
  return useSyncExternalStore(subscribeCredentials, getCurrentUserId);
}

// Hosts supply identity only; cloud APIs remain responsible for device ownership.
export const CurrentDeviceContext = createContext<
  (() => Promise<string | null>) | undefined
>(undefined);
export function useCurrentDeviceId() {
  const userId = useRuntimeUserId();
  const getId = useContext(CurrentDeviceContext);
  const [state, setState] = useState<{ userId: string; id: string | null }>();
  useEffect(() => {
    if (!getId || !userId) return;
    let active = true;
    const load = async () => {
      try {
        const id = await getId();
        if (active) setState({ userId, id });
      } catch {
        if (active) setState({ userId, id: null });
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [getId, userId]);
  return state?.userId === userId ? state.id : null;
}
export function useLocalDevices() {
  const userId = useRuntimeUserId();
  const [state, setState] = useState<{
    userId: string;
    devices?: LocalDevice[];
    error: string;
  }>();
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const result = await runtimeApi.devices();
        if (active) {
          setState({ userId, devices: result, error: '' });
        }
      } catch (err) {
        if (active)
          setState(old => ({
            userId,
            devices: old?.userId === userId ? old.devices : undefined,
            error: String(err),
          }));
      } finally {
        if (active) timer = setTimeout(load, 5000);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [revision, userId]);
  const current = state?.userId === userId ? state : undefined;
  return { devices: current?.devices, error: current?.error ?? '', refresh };
}
