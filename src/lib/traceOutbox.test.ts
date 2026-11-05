import { TraceOutbox, type TraceProps } from './traceOutbox';

const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
let queues: TraceOutbox[] = [];
function fixture() {
  let stored: string | null = null;
  let scope = 'api:user-a';
  let online = false;
  const sent: TraceProps[] = [];
  const send = jest.fn(async (props: TraceProps) => {
    sent.push(props);
  });
  const create = () => {
    const queue = new TraceOutbox({
      read: async () => stored,
      write: async value => {
        stored = value;
      },
      scope: () => scope,
      online: () => online,
      send,
    });
    queues.push(queue);
    return queue;
  };
  return {
    create,
    send,
    sent,
    storage: () => stored,
    scope: (value: string) => {
      scope = value;
    },
    online: (value: boolean) => {
      online = value;
    },
  };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-05T02:00:00Z'));
});
afterEach(() => {
  queues.forEach(queue => queue.dispose());
  queues = [];
  jest.useRealTimers();
});

test('keeps exact copy and original time offline, then delivers once on reconnect', async () => {
  const f = fixture(),
    queue = f.create();
  const props = {
    dedupe_key: 'display:c:m:网络异常',
    display_message: ' 网络异常\n请重试 ',
    conversation_id: 'c',
  };
  await queue.enqueue(props);
  expect(f.send).not.toHaveBeenCalled();
  const original = JSON.parse(f.storage()!)[0].props.occurred_at;
  jest.setSystemTime(Date.now() + 60_000);
  await queue.enqueue(props);
  expect(JSON.parse(f.storage()!)).toHaveLength(1);
  f.online(true);
  await queue.flush();
  expect(f.sent).toEqual([{ ...props, occurred_at: original }]);
  expect(JSON.parse(f.storage()!)).toEqual([]);
});

test('retains rejected deliveries and automatically retries after transport recovers', async () => {
  const f = fixture(),
    queue = f.create();
  f.online(true);
  f.send.mockRejectedValueOnce(new Error('offline'));
  await queue.enqueue({ dedupe_key: 'retry' });
  await flush();
  expect(JSON.parse(f.storage()!)).toHaveLength(1);
  jest.advanceTimersByTime(10_000);
  await flush();
  expect(f.send).toHaveBeenCalledTimes(2);
  expect(JSON.parse(f.storage()!)).toEqual([]);
});

test('restores unsent events after a reload without changing occurrence time', async () => {
  const f = fixture(),
    first = f.create();
  await first.enqueue({ dedupe_key: 'reload', display_message: 'exact' });
  const original = JSON.parse(f.storage()!)[0].props.occurred_at;
  first.dispose();
  jest.setSystemTime(Date.now() + 120_000);
  f.online(true);
  await f.create().flush();
  await flush();
  expect(f.sent[0]).toMatchObject({
    occurred_at: original,
    display_message: 'exact',
  });
});

test('does not send a queued event under another account or API environment', async () => {
  const f = fixture(),
    queue = f.create();
  await queue.enqueue({ dedupe_key: 'identity', user_id: 'user-a' });
  for (const scope of ['api:user-b', 'other-api:user-a', 'api:']) {
    f.scope(scope);
    f.online(true);
    await queue.flush();
    expect(f.send).not.toHaveBeenCalled();
  }
  f.scope('api:user-a');
  await queue.flush();
  expect(f.sent).toHaveLength(1);
});

test('enqueues during an in-flight send without losing or duplicating either event', async () => {
  const f = fixture(),
    queue = f.create();
  let resolve!: () => void;
  f.send.mockImplementationOnce(async props => {
    await new Promise<void>(done => {
      resolve = done;
    });
    f.sent.push(props);
  });
  f.online(true);
  await queue.enqueue({ dedupe_key: 'first' });
  await flush();
  await queue.enqueue({ dedupe_key: 'second' });
  resolve();
  await flush();
  expect(f.sent.map(p => p.dedupe_key)).toEqual(['first', 'second']);
  expect(JSON.parse(f.storage()!)).toEqual([]);
});

test('bounds the queue and expires stale events rather than sending a stale backlog', async () => {
  const f = fixture(),
    queue = f.create();
  for (let i = 0; i < 105; i++) await queue.enqueue({ dedupe_key: String(i) });
  expect(JSON.parse(f.storage()!)).toHaveLength(100);
  jest.setSystemTime(Date.now() + 24 * 60 * 60 * 1000 + 1);
  f.online(true);
  await queue.flush();
  expect(f.send).not.toHaveBeenCalled();
});

test('survives corrupted or disabled storage with in-memory delivery', async () => {
  const sent: TraceProps[] = [];
  const queue = new TraceOutbox({
    read: async () => '{broken',
    write: async () => {
      throw new Error('storage disabled');
    },
    scope: () => 'a',
    send: async props => {
      sent.push(props);
    },
  });
  queues.push(queue);
  await queue.enqueue({ display_message: 'exact' });
  await flush();
  expect(sent).toHaveLength(1);
});

test('a backwards device-clock adjustment does not erase a legitimate offline event', async () => {
  const f = fixture(),
    queue = f.create();
  await queue.enqueue({ dedupe_key: 'clock' });
  const original = JSON.parse(f.storage()!)[0].props.occurred_at;
  jest.setSystemTime(Date.now() - 60_000);
  f.online(true);
  await queue.flush();
  expect(f.sent).toHaveLength(1);
  expect(f.sent[0].occurred_at).toBe(original);
});
