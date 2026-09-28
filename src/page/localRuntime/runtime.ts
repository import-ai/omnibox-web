import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { http } from '@/lib/request';

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

// Hosts supply identity only; cloud APIs remain responsible for device ownership.
export const CurrentDeviceContext = createContext<
  (() => Promise<string | null>) | undefined
>(undefined);
export function useCurrentDeviceId() {
  const getId = useContext(CurrentDeviceContext);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const value = await getId?.();
        if (active) setId(value ?? null);
      } catch {
        if (active) setId(null);
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [getId]);
  return id;
}
export function useLocalDevices() {
  const [devices, setDevices] = useState<LocalDevice[]>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const result = await runtimeApi.devices();
        if (active) {
          setDevices(result);
          setError('');
        }
      } catch (err) {
        if (active) setError(String(err));
      } finally {
        if (active) timer = setTimeout(load, 5000);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [revision]);
  return { devices, error, refresh };
}
