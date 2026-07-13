import type { ResourceMeta } from '@/interface';

import {
  getRememberedComposerSelection,
  snapSelectionToAtomicBoundary,
} from './composerAtomicRanges';
import {
  createResourceMentionText,
  insertResourceMention,
} from './composerDocument';
import { createToolTokenText, insertToolRange } from './composerToolTokens';
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

describe('composer atomic ranges', () => {
  it('snaps a caret inside a resource mention to its nearest boundary', () => {
    const document = insertResourceMention(
      { text: '', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 0, end: 0 },
      'Untitled'
    );
    const mention = document.mentions[0];

    expect(
      snapSelectionToAtomicBoundary(
        { start: mention.start + 1, end: mention.start + 1 },
        document.mentions,
        []
      )
    ).toEqual({ start: mention.start, end: mention.start });
    expect(
      snapSelectionToAtomicBoundary(
        { start: mention.end - 1, end: mention.end - 1 },
        document.mentions,
        []
      )
    ).toEqual({ start: mention.end, end: mention.end });
  });

  it('expands a selection to complete resource and tool boundaries', () => {
    const withResource = insertResourceMention(
      { text: 'A', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 1, end: 1 },
      'Untitled'
    );
    const withTool = insertToolRange(
      { text: withResource.text, tools: [] },
      ToolType.WEB_SEARCH,
      '联网搜索',
      withResource.selection
    );
    const mention = withResource.mentions[0];
    const tool = withTool.tools[0];

    expect(
      snapSelectionToAtomicBoundary(
        { start: mention.start + 1, end: tool.end - 1 },
        withResource.mentions,
        withTool.tools
      )
    ).toEqual({ start: mention.start, end: tool.end });
  });

  it('keeps the remembered insertion point while the textarea is unfocused', () => {
    const resourceText = createResourceMentionText('plan.md');
    const toolText = createToolTokenText('联网搜索');
    const remembered = {
      start: resourceText.length + toolText.length,
      end: resourceText.length + toolText.length,
    };

    expect(
      getRememberedComposerSelection({
        domSelection: { start: 0, end: 0 },
        isTextareaActive: false,
        mentions: [],
        rememberedSelection: remembered,
        toolRanges: [],
      })
    ).toEqual(remembered);
  });
});
