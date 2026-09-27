import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import ExecutionCard from './ExecutionCard';
import { LocalDevice, LocalExecution, runtimeApi, terminal } from './runtime';

interface Store {
  executions: Map<string, LocalExecution>;
  devices: LocalDevice[];
  refresh: () => void;
  watch: () => () => void;
}

const ExecutionsContext = createContext<Store | null>(null);

export function ConversationExecutionsProvider({
  conversationId,
  children,
}: {
  conversationId?: string;
  children: ReactNode;
}) {
  const [executions, setExecutions] = useState(
    new Map<string, LocalExecution>()
  );
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [revision, setRevision] = useState(0);
  const [watchers, setWatchers] = useState(0);
  const live = watchers > 0;
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const rows: LocalExecution[] = [];
        let page: LocalExecution[];
        do {
          page = await runtimeApi.executions(conversationId, rows.length);
          rows.push(...page);
        } while (page.length === 100);
        const devices = await runtimeApi.devices();
        if (!active) return;
        setExecutions(new Map(rows.map(e => [e.tool_call_id, e])));
        setDevices(devices);
      } catch {
        // Cards keep the last known state; the next poll retries.
      } finally {
        if (active && live) timer = setTimeout(load, 2000);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [conversationId, revision, live]);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  const watch = useCallback(() => {
    setWatchers(v => v + 1);
    return () => setWatchers(v => v - 1);
  }, []);
  const store = useMemo(
    () => ({ executions, devices, refresh, watch }),
    [executions, devices, refresh, watch]
  );
  return (
    <ExecutionsContext.Provider value={store}>
      {children}
    </ExecutionsContext.Provider>
  );
}

export function ToolCallExecution({
  toolCallId,
  toolCallDone,
}: {
  toolCallId: string;
  toolCallDone: boolean;
}) {
  const store = useContext(ExecutionsContext);
  const execution = store?.executions.get(toolCallId);
  // Poll until both the execution and the tool call that waits on it settle.
  const live = execution ? !terminal.has(execution.status) : !toolCallDone;
  const watch = store?.watch;
  useEffect(() => {
    if (live && watch) return watch();
  }, [live, watch]);
  if (!store || !execution) return null;
  return (
    <ExecutionCard
      execution={execution}
      deviceName={
        store.devices.find(d => d.id === execution.device_id)?.name ??
        execution.device_id
      }
      refresh={store.refresh}
    />
  );
}
