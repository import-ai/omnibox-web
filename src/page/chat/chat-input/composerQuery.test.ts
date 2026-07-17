import type { ResourceMeta } from '@/interface';

import { insertResourceMention } from './composerDocument';
import {
  displayPartsFromComposerText,
  queryFromComposerDisplayText,
} from './composerQuery';
import { insertToolRange } from './composerToolTokens';
import { ToolType } from './types';

function resource(id: string, name: string): ResourceMeta {
  return {
    id,
    name,
    parent_id: null,
    resource_type: 'file',
    attrs: { original_name: name },
  };
}

describe('composer query', () => {
  it('keeps resource labels in query while removing layout spacers and tool tokens', () => {
    const withResource = insertResourceMention(
      { text: 'read  now', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 5, end: 5 },
      'Untitled'
    );
    const withTool = insertToolRange(
      { text: withResource.text, tools: [] },
      ToolType.WEB_SEARCH,
      'Web Search',
      withResource.selection
    );

    expect(
      queryFromComposerDisplayText(
        withTool.text,
        withResource.mentions,
        withTool.tools
      )
    ).toBe('read plan.md now');
  });

  it('exports display parts in the same order as the composer text', () => {
    const withWebSearch = insertToolRange(
      { text: '总结', tools: [] },
      ToolType.WEB_SEARCH,
      '联网搜索',
      { start: 0, end: 0 }
    );
    const withReasoning = insertToolRange(
      withWebSearch,
      ToolType.REASONING,
      '深度思考',
      withWebSearch.selection
    );
    const withResource = insertResourceMention(
      { text: withReasoning.text, mentions: [] },
      resource('r1', 'plan.md'),
      withReasoning.selection,
      'Untitled'
    );

    expect(
      displayPartsFromComposerText(
        withResource.text,
        withResource.mentions,
        withReasoning.tools
      )
    ).toEqual([
      { type: 'tool', tool: ToolType.WEB_SEARCH },
      { type: 'tool', tool: ToolType.REASONING },
      {
        type: 'resource',
        resource: {
          id: 'r1',
          name: 'plan.md',
          type: 'resource',
          resource_type: 'file',
          attrs: { original_name: 'plan.md' },
        },
      },
      { type: 'text', text: '总结' },
    ]);
  });
});
