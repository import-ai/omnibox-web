import { createPaintScheduler } from './streamPaintScheduler';

describe('createPaintScheduler', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('yields after boundary stream messages', async () => {
    jest.useFakeTimers();
    const schedulePaint = createPaintScheduler();
    let resolved = false;

    const promise = schedulePaint(
      JSON.stringify({ response_type: 'bos' })
    ).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    jest.runOnlyPendingTimers();
    await promise;
    expect(resolved).toBe(true);
  });

  it('does not yield for every delta chunk', async () => {
    jest.useFakeTimers();
    const schedulePaint = createPaintScheduler();
    let resolved = false;

    await schedulePaint(JSON.stringify({ response_type: 'delta' })).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('yields after a small batch of delta chunks', async () => {
    jest.useFakeTimers();
    const schedulePaint = createPaintScheduler();

    for (let index = 0; index < 15; index += 1) {
      await schedulePaint(JSON.stringify({ response_type: 'delta' }));
    }

    let resolved = false;
    const promise = schedulePaint(
      JSON.stringify({ response_type: 'delta' })
    ).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(jest.getTimerCount()).toBe(1);
    jest.runOnlyPendingTimers();
    await promise;
    expect(resolved).toBe(true);
  });
});
