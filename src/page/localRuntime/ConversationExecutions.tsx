import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import ExecutionCard from './ExecutionCard';
import {
  LocalDevice,
  LocalExecution,
  LocalExecutionPage,
  runtimeApi,
  terminal,
  useLocalDevices,
  useRuntimeUserId,
} from './runtime';

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
  const userId = useRuntimeUserId();
  return (
    <ConversationExecutions
      key={`${userId}:${conversationId}`}
      conversationId={userId ? conversationId : undefined}
    >
      {children}
    </ConversationExecutions>
  );
}

function ConversationExecutions({
  conversationId,
  children,
}: {
  conversationId?: string;
  children: ReactNode;
}) {
  const [executions, setExecutions] = useState(
    new Map<string, LocalExecution>()
  );
  const { devices: knownDevices } = useLocalDevices();
  const devices = useMemo(() => knownDevices ?? [], [knownDevices]);
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
        let page: LocalExecutionPage;
        do {
          page = await runtimeApi.executions(conversationId, rows.length);
          if (!active) return;
          rows.push(...page.items);
        } while (page.items.length > 0 && rows.length < page.total);
        if (!active) return;
        setExecutions(new Map(rows.map(e => [e.tool_call_id, e])));
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
  const { t } = useTranslation();
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
        t('local_runtime.removed_device')
      }
      refresh={store.refresh}
    />
  );
}
