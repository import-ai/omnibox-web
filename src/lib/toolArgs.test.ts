import type { TFunction } from 'i18next';

import { processArgs } from './toolArgs';

const t = ((key: string) =>
  ({
    'chat.messages.tool_calls.function_args.private': '个人',
    'chat.messages.tool_calls.function_args.teamspace': '团队',
  })[key] ?? key) as unknown as TFunction;

describe('processArgs', () => {
  it('translates the scope arg of agent asset tools', () => {
    const args = processArgs({ scope: 'private', asset_name: 'TAGS.md' }, t);
    expect(args.map(arg => arg.display)).toEqual(['个人', 'TAGS.md']);
  });

  it('leaves an unexpected scope value untouched', () => {
    expect(processArgs({ scope: 'share' }, t)[0].display).toBe('share');
  });
});
