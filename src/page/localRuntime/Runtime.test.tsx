/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';

import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import {
  ConversationExecutionsProvider,
  ToolCallExecution,
} from './ConversationExecutions';
import ExecutionCard from './ExecutionCard';
import ExecutionList from './ExecutionList';
import RenameDevice from './RenameDevice';
import {
  CurrentDeviceContext,
  LocalDevice,
  LocalExecution,
  useCurrentDeviceId,
  useLocalDevices,
} from './runtime';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), patch: jest.fn() },
}));
jest.mock('js-cookie', () => ({
  __esModule: true,
  default: { remove: jest.fn(), set: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/time', () => ({ getRelatedTime: () => 'now' }));
jest.mock('@/components/tooltip', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => children;
  return {
    Tooltip: Wrapper,
    TooltipTrigger: Wrapper,
    TooltipContent: Wrapper,
    TooltipProvider: Wrapper,
  };
});
jest.mock('@/components/ui/Popover', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => children;
  return { Popover: Wrapper, PopoverTrigger: Wrapper, PopoverContent: Wrapper };
});
jest.mock('@/components/ui/Label', () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const mockGet = jest.mocked(http.get);
const mockPatch = jest.mocked(http.patch);
const device: LocalDevice = {
  id: 'device-a',
  name: 'Computer A',
  online: true,
  platform: 'darwin',
  shell: '/bin/zsh',
  command_policy: 'ask',
  paused: false,
  last_seen_at: null,
  revoked_at: null,
};
const execution: LocalExecution = {
  id: 'execution-a',
  device_id: device.id,
  command: 'curl --token secret-account-a',
  conversation_id: 'conversation-a',
  tool_call_id: 'tool-a',
  namespace_id: 'namespace-a',
  cwd: '/missing',
  timeout_seconds: 30,
  status: 'failed',
  created_at: '2026-09-29T00:00:00Z',
  started_at: null,
  finished_at: null,
  approved_at: null,
  approval_expires_at: null,
  exit_code: null,
  approvals: [],
};
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  localStorage.clear();
  setGlobalCredential('account-a', 'token-a');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.useRealTimers();
});
function button(label: string) {
  return [...container.querySelectorAll('button')].find(element =>
    element.textContent?.includes(label)
  )!;
}

it('clears device data on cross-tab account changes and ignores old requests', async () => {
  function Devices() {
    const { devices } = useLocalDevices();
    return <span>{devices?.[0]?.name}</span>;
  }
  mockGet.mockResolvedValue([device]);
  await act(async () => root.render(<Devices />));
  expect(container.textContent).toBe(device.name);
  let finishOldRequest!: (devices: LocalDevice[]) => void;
  mockGet.mockImplementationOnce(
    () => new Promise(resolve => (finishOldRequest = resolve))
  );
  await act(async () => jest.advanceTimersByTime(5000));
  mockGet.mockRejectedValue(new Error('Network unavailable'));
  await act(async () => {
    localStorage.setItem('uid', 'account-b');
    localStorage.setItem('token', 'token-b');
    window.dispatchEvent(new StorageEvent('storage', { key: 'uid' }));
  });
  expect(container.textContent).toBe('');
  await act(async () => finishOldRequest([device]));
  expect(container.textContent).toBe('');
  mockGet.mockResolvedValue([{ ...device, name: 'Computer C' }]);
  await act(async () => setGlobalCredential('account-c', 'token-c'));
  expect(container.textContent).toBe('Computer C');
});

it('clears history immediately on same-window account changes even when reload fails', async () => {
  mockGet.mockResolvedValue({ items: [execution], total: 1 });
  await act(async () => root.render(<ExecutionList devices={[device]} />));
  expect(container.textContent).toContain('secret-account-a');
  let finishOldRequest!: (value: unknown) => void;
  mockGet.mockImplementationOnce(
    () => new Promise(resolve => (finishOldRequest = resolve))
  );
  await act(async () => jest.advanceTimersByTime(5000));
  mockGet.mockRejectedValue(new Error('Network unavailable'));
  await act(async () => setGlobalCredential('account-b', 'token-b'));
  expect(container.textContent).not.toContain('secret-account-a');
  await act(async () => finishOldRequest({ items: [execution], total: 1 }));
  expect(container.textContent).not.toContain('secret-account-a');
});

it('uses total to finish history pagination at an exact page boundary', async () => {
  const items = Array.from({ length: 100 }, (_, id) => ({
    ...execution,
    id: String(id),
  }));
  mockGet.mockResolvedValue({ items, total: 100 });
  await act(async () => root.render(<ExecutionList devices={[device]} />));
  expect(mockGet).toHaveBeenCalledWith('/local-executions', {
    params: { conversation_id: undefined, offset: 0, limit: 100 },
    mute: true,
  });
  expect(button('local_runtime.more')).toBeUndefined();
  mockGet.mockResolvedValue({ items, total: 101 });
  await act(async () => button('common.refresh').click());
  expect(button('local_runtime.more')).toBeDefined();
  mockGet.mockImplementation((_url, config) =>
    Promise.resolve({
      items:
        config?.params.offset === 100 ? [{ ...execution, id: '100' }] : items,
      total: 101,
    })
  );
  await act(async () => button('local_runtime.more').click());
  expect(button('local_runtime.more')).toBeUndefined();
});

it('loads conversation pages using total and clears cards when the account changes', async () => {
  mockGet.mockImplementation((url, config) => {
    if (url === '/local-devices') return Promise.resolve([device]);
    return Promise.resolve({
      items: [
        {
          ...execution,
          tool_call_id: config?.params.offset ? 'tool-b' : 'tool-a',
        },
      ],
      total: 2,
    });
  });
  await act(async () =>
    root.render(
      <ConversationExecutionsProvider conversationId="conversation-a">
        <ToolCallExecution toolCallId="tool-b" toolCallDone />
      </ConversationExecutionsProvider>
    )
  );
  expect(mockGet).toHaveBeenCalledWith('/local-executions', {
    params: { conversation_id: 'conversation-a', offset: 1, limit: 100 },
    mute: true,
  });
  expect(container.textContent).toContain('secret-account-a');
  mockGet.mockRejectedValue(new Error('Network unavailable'));
  await act(async () => setGlobalCredential('account-b', 'token-b'));
  expect(container.textContent).not.toContain('secret-account-a');
});

it('shows failure details from status events without routine progress messages', async () => {
  mockGet.mockResolvedValue([
    { sequence: 1, kind: 'status', data: 'Starting command' },
    { sequence: 2, kind: 'status', data: 'spawn /bin/zsh ENOENT' },
  ]);
  await act(async () =>
    root.render(
      <ExecutionCard
        execution={execution}
        deviceName={device.name}
        refresh={() => {}}
      />
    )
  );
  await act(async () => button('local_runtime.show_output').click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    'ENOENT'
  );
  expect(container.textContent).not.toContain('Starting command');
  await act(async () =>
    root.render(
      <ExecutionCard
        execution={{ ...execution, status: 'succeeded' }}
        deviceName={device.name}
        refresh={() => {}}
      />
    )
  );
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

it('ignores IME confirmation and saves only a subsequent ordinary Enter', async () => {
  mockPatch.mockResolvedValue(undefined);
  await act(async () =>
    root.render(<RenameDevice device={device} refresh={() => {}} />)
  );
  const input = container.querySelector('input')!;
  await act(async () =>
    Simulate.change(input, {
      target: { value: 'zhong' },
    } as unknown as React.ChangeEvent<HTMLInputElement>)
  );
  for (const extra of [{ isComposing: true }, { keyCode: 229 }]) {
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, ...extra })
      )
    );
  }
  expect(mockPatch).not.toHaveBeenCalled();
  await act(async () =>
    Simulate.change(input, {
      target: { value: '中文电脑' },
    } as unknown as React.ChangeEvent<HTMLInputElement>)
  );
  await act(async () =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
  );
  expect(mockPatch).toHaveBeenCalledWith('/local-devices/device-a', {
    name: '中文电脑',
  });
});

it('clears the host device identity and ignores requests from the old account', async () => {
  function Identity() {
    return <span>{useCurrentDeviceId()}</span>;
  }
  const getId = jest
    .fn<Promise<string | null>, []>()
    .mockResolvedValue('device-a');
  await act(async () =>
    root.render(
      <CurrentDeviceContext.Provider value={getId}>
        <Identity />
      </CurrentDeviceContext.Provider>
    )
  );
  expect(container.textContent).toBe('device-a');
  let finishOldRequest!: (id: string) => void;
  getId.mockImplementationOnce(
    () => new Promise(resolve => (finishOldRequest = resolve))
  );
  await act(async () => jest.advanceTimersByTime(5000));
  getId.mockRejectedValue(new Error('Host unavailable'));
  await act(async () => setGlobalCredential('account-b', 'token-b'));
  expect(container.textContent).toBe('');
  await act(async () => finishOldRequest('device-a'));
  expect(container.textContent).toBe('');
});
