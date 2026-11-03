/** @jest-environment jsdom */
import {
  getPendingDocsAppearance,
  persistDocsAppearance,
} from './docsAppearance';

const mockPost = jest.fn();
jest.mock('@/lib/request', () => ({
  http: { post: (...args: unknown[]) => mockPost(...args) },
}));
const key = 'omnibox-docs-appearance';
function pending(mode: string) {
  localStorage.setItem(key, JSON.stringify({ user_id: 'user-a', mode }));
}
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('uid', 'user-a');
  mockPost.mockReset().mockResolvedValue(undefined);
});

it('persists and acknowledges the signed-in docs preference', async () => {
  pending('dark');
  await persistDocsAppearance('user-a');
  expect(mockPost).toHaveBeenCalledWith('/user/option', {
    name: 'theme',
    value: 'dark',
  });
  expect(localStorage.getItem(key)).toBeNull();
});

it('does not consume another account or invalid preference', async () => {
  pending('dark');
  expect(getPendingDocsAppearance('user-b')).toBeNull();
  await persistDocsAppearance('user-b');
  pending('invalid');
  await persistDocsAppearance('user-a');
  expect(mockPost).not.toHaveBeenCalled();
});

it('keeps failed preferences for a later retry', async () => {
  pending('system');
  mockPost.mockRejectedValueOnce(new Error('offline'));
  await expect(persistDocsAppearance('user-a')).rejects.toThrow('offline');
  expect(getPendingDocsAppearance('user-a')?.mode).toBe('system');
  await persistDocsAppearance('user-a');
  expect(localStorage.getItem(key)).toBeNull();
});

it('serializes changes that arrive while an older preference is being saved', async () => {
  let release!: () => void;
  mockPost.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      })
  );
  pending('light');
  const save = persistDocsAppearance('user-a');
  pending('dark');
  const second = persistDocsAppearance('user-a');
  release();
  await Promise.all([save, second]);
  expect(mockPost.mock.calls).toEqual([
    ['/user/option', { name: 'theme', value: 'light' }],
    ['/user/option', { name: 'theme', value: 'dark' }],
  ]);
  expect(localStorage.getItem(key)).toBeNull();
});

it('does not let an older pending docs choice override a newer Web selection', async () => {
  pending('dark');
  localStorage.setItem('theme', JSON.stringify({ skin: 'light' }));
  expect(getPendingDocsAppearance('user-a')).toBeNull();
  await persistDocsAppearance('user-a');
  expect(mockPost).not.toHaveBeenCalled();
});

it('reconciles a Web choice made while the docs save was in flight', async () => {
  let release!: () => void;
  mockPost.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      })
  );
  pending('light');
  localStorage.setItem('theme', JSON.stringify({ skin: 'light' }));
  const save = persistDocsAppearance('user-a');
  localStorage.setItem('theme', JSON.stringify({ skin: 'dark' }));
  release();
  await save;
  expect(mockPost.mock.calls.map(call => call[1].value)).toEqual([
    'light',
    'dark',
  ]);
});

function independentTab() {
  let tab!: typeof import('./docsAppearance');
  jest.isolateModules(() => {
    tab = jest.requireActual('./docsAppearance');
  });
  return tab;
}

it.each(['older-last', 'newer-last'])(
  'reconciles two independent Web tabs when saves finish %s',
  async order => {
    const tabA = independentTab();
    const tabB = independentTab();
    const finish: Array<() => void> = [];
    let serverMode = 'system';
    mockPost.mockImplementation((_url, body) => {
      if (finish.length >= 2) {
        serverMode = body.value;
        return Promise.resolve();
      }
      return new Promise<void>(resolve => {
        finish.push(() => {
          serverMode = body.value;
          resolve();
        });
      });
    });
    pending('light');
    localStorage.setItem('theme', JSON.stringify({ skin: 'light' }));
    const saveA = tabA.persistDocsAppearance('user-a');
    pending('dark');
    localStorage.setItem('theme', JSON.stringify({ skin: 'dark' }));
    const saveB = tabB.persistDocsAppearance('user-a');
    expect(finish).toHaveLength(2);
    if (order === 'older-last') {
      finish[1]();
      await saveB;
      expect(localStorage.getItem(key)).toBeNull();
      finish[0]();
      await saveA;
    } else {
      finish[0]();
      await saveA;
      finish[1]();
      await saveB;
    }
    expect(serverMode).toBe('dark');
    expect(localStorage.getItem(key)).toBeNull();
  }
);

it('retains a corrective save after another tab acknowledged the latest choice', async () => {
  const tabA = independentTab();
  const tabB = independentTab();
  let finishOld!: () => void;
  mockPost
    .mockImplementationOnce(
      () => new Promise<void>(resolve => (finishOld = resolve))
    )
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('offline'));
  pending('light');
  localStorage.setItem('theme', JSON.stringify({ skin: 'light' }));
  const saveA = tabA.persistDocsAppearance('user-a');
  pending('dark');
  localStorage.setItem('theme', JSON.stringify({ skin: 'dark' }));
  await tabB.persistDocsAppearance('user-a');
  expect(localStorage.getItem(key)).toBeNull();
  finishOld();
  await expect(saveA).rejects.toThrow('offline');
  expect(getPendingDocsAppearance('user-a')?.mode).toBe('dark');
  await tabA.persistDocsAppearance('user-a');
  expect(mockPost.mock.calls.map(call => call[1].value)).toEqual([
    'light',
    'dark',
    'dark',
    'dark',
  ]);
  expect(localStorage.getItem(key)).toBeNull();
});

it('does not reconcile or acknowledge another account after an in-flight save', async () => {
  let finish!: () => void;
  mockPost.mockImplementationOnce(
    () => new Promise<void>(resolve => (finish = resolve))
  );
  pending('light');
  localStorage.setItem('theme', JSON.stringify({ skin: 'light' }));
  const save = persistDocsAppearance('user-a');
  localStorage.setItem('uid', 'user-b');
  const other = JSON.stringify({ user_id: 'user-b', mode: 'dark' });
  localStorage.setItem(key, other);
  localStorage.setItem('theme', JSON.stringify({ skin: 'dark' }));
  finish();
  await save;
  expect(localStorage.getItem(key)).toBe(other);
  expect(mockPost).toHaveBeenCalledTimes(1);
});
