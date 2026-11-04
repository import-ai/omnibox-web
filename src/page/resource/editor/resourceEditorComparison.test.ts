import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

interface ComparisonResult {
  remountUnchanged: boolean;
  draftRemountUnchanged: boolean;
  draftAndCommentsUnchanged: boolean;
  linkQueryChanged: boolean;
  codeWhitespaceChanged: boolean;
  attachmentTargetChanged: boolean;
}

it('compares real editor documents without false dirty state', () => {
  const output = execFileSync(
    process.execPath,
    [resolve('scripts/testResourceEditorComparison.mjs')],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 60000 }
  );
  const result = JSON.parse(output) as ComparisonResult;

  expect(result).toEqual({
    remountUnchanged: true,
    draftRemountUnchanged: true,
    draftAndCommentsUnchanged: true,
    linkQueryChanged: true,
    codeWhitespaceChanged: true,
    attachmentTargetChanged: true,
  });
}, 70000);
