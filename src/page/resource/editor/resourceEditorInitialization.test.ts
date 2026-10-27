import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

interface InitializationResult {
  editable: boolean;
  normalize: boolean;
  error: string | null;
  ready: boolean;
  inputUnchanged: boolean;
  markers: { id: string; text: string }[];
  ranges: ({ from: number; to: number } | null)[];
}

it('initializes the real editor and restores quote markers after empty-quote repair in both modes', () => {
  const output = execFileSync(
    process.execPath,
    [resolve('scripts/testResourceEditorInitialization.mjs')],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 30000 }
  );
  const [broken, ...repaired] = JSON.parse(output) as InitializationResult[];
  expect(broken.error).toBe('Invalid content for node type blockquote');
  expect(broken.ready).toBe(false);
  expect(broken.markers).toEqual([]);
  expect(repaired).toHaveLength(6);
  expect(new Set(repaired.map(result => result.editable))).toEqual(
    new Set([false, true])
  );
  for (const result of repaired) {
    expect(result.error).toBeNull();
    expect(result.ready).toBe(true);
    expect(result.inputUnchanged).toBe(true);
    expect(result.markers).toEqual([
      { id: 'first', text: 'First quote' },
      { id: 'second', text: 'Second quote' },
    ]);
    expect(result.ranges).toEqual([
      { from: expect.any(Number), to: expect.any(Number) },
      { from: expect.any(Number), to: expect.any(Number) },
    ]);
  }
}, 40000);
