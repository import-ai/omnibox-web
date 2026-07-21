import type { ResourceMeta } from '@/interface';

import { getRememberedComposerSelection } from './composerAtomicRanges';
import {
  createResourceMentionText,
  insertResourceMention,
} from './composerDocument';
import { syncComposerResources } from './composerExternalSync';
import {
  insertComposerResource,
  toggleComposerTool,
} from './composerOperations';
import { displayPartsFromComposerText } from './composerQuery';
import { createComposerState } from './composerState';
import { createToolTokenText } from './composerToolTokens';
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

describe('composer operations', () => {
  it('keeps later token ranges aligned when reusing an existing space', () => {
    const initial = createComposerState('read  now');
    const withTool = toggleComposerTool(
      initial,
      ToolType.WEB_SEARCH,
      'Web Search',
      { start: 6, end: 6 }
    );
    expect(withTool).not.toBeNull();

    const withResource = insertComposerResource(
      withTool?.state ?? initial,
      resource('r1', 'plan.md'),
      { start: 5, end: 5 },
      'Untitled'
    );
    const tokenText = createResourceMentionText('plan.md');

    expect(withResource.state.displayText).toBe(
      `read ${tokenText} ${createToolTokenText('Web Search')}now`
    );
    expect(withResource.state.toolRanges[0].start).toBe(6 + tokenText.length);
  });

  it('keeps toolbar token order while the textarea loses focus', () => {
    const initial = createComposerState('你好你是谁');
    const first = toggleComposerTool(initial, ToolType.WEB_SEARCH, '联网搜索', {
      start: initial.displayText.length,
      end: initial.displayText.length,
    });
    expect(first).not.toBeNull();

    const remembered = getRememberedComposerSelection({
      domSelection: { start: 0, end: 0 },
      isTextareaActive: false,
      mentions: first?.state.mentions ?? [],
      rememberedSelection: first?.selection ?? { start: 0, end: 0 },
      toolRanges: first?.state.toolRanges ?? [],
    });
    const second = toggleComposerTool(
      first?.state ?? initial,
      ToolType.REASONING,
      '深度思考',
      remembered
    );

    expect(
      displayPartsFromComposerText(
        second?.state.displayText ?? '',
        second?.state.mentions ?? [],
        second?.state.toolRanges ?? []
      ).map(part => (part.type === 'tool' ? part.tool : part.type))
    ).toEqual(['text', ToolType.WEB_SEARCH, ToolType.REASONING]);
  });

  it('keeps a resource selected after tools at the end of the sequence', () => {
    const initial = createComposerState('分析一下');
    const webSearch = toggleComposerTool(
      initial,
      ToolType.WEB_SEARCH,
      '联网搜索',
      { start: initial.displayText.length, end: initial.displayText.length }
    );
    const reasoning = toggleComposerTool(
      webSearch?.state ?? initial,
      ToolType.REASONING,
      '深度思考',
      webSearch?.selection ?? { start: 0, end: 0 }
    );
    const withResource = insertComposerResource(
      reasoning?.state ?? initial,
      resource('r1', 'plan.md'),
      reasoning?.selection ?? { start: 0, end: 0 },
      'Untitled'
    );

    expect(
      displayPartsFromComposerText(
        withResource.state.displayText,
        withResource.state.mentions,
        withResource.state.toolRanges
      ).map(part => (part.type === 'tool' ? part.tool : part.type))
    ).toEqual([
      'text',
      ToolType.WEB_SEARCH,
      ToolType.REASONING,
      'resource',
      'text',
    ]);
    expect(withResource.state.mentions).toHaveLength(1);
  });

  it('keeps resource metadata when tools are selected afterward', () => {
    const initial = createComposerState('分析一下');
    const withResource = insertComposerResource(
      initial,
      resource('r1', 'plan.md'),
      { start: initial.displayText.length, end: initial.displayText.length },
      'Untitled'
    );
    const webSearch = toggleComposerTool(
      withResource.state,
      ToolType.WEB_SEARCH,
      '联网搜索',
      withResource.selection
    );
    const reasoning = toggleComposerTool(
      webSearch?.state ?? withResource.state,
      ToolType.REASONING,
      '深度思考',
      webSearch?.selection ?? withResource.selection
    );

    expect(reasoning?.state.mentions).toHaveLength(1);
    expect(
      displayPartsFromComposerText(
        reasoning?.state.displayText ?? '',
        reasoning?.state.mentions ?? [],
        reasoning?.state.toolRanges ?? []
      ).map(part => (part.type === 'tool' ? part.tool : part.type))
    ).toEqual([
      'text',
      'resource',
      'text',
      ToolType.WEB_SEARCH,
      ToolType.REASONING,
    ]);
  });

  it('keeps one resource token at its original position when selected again', () => {
    const initial = createComposerState('分析一下');
    const withResource = insertComposerResource(
      initial,
      resource('r1', 'plan.md'),
      { start: initial.displayText.length, end: initial.displayText.length },
      'Untitled'
    );
    const webSearch = toggleComposerTool(
      withResource.state,
      ToolType.WEB_SEARCH,
      '联网搜索',
      withResource.selection
    );
    expect(webSearch).not.toBeNull();

    const repeated = insertComposerResource(
      webSearch?.state ?? withResource.state,
      resource('r1', 'plan.md'),
      webSearch?.selection ?? withResource.selection,
      'Untitled'
    );

    expect(repeated.state.mentions).toHaveLength(1);
    expect(
      displayPartsFromComposerText(
        repeated.state.displayText,
        repeated.state.mentions,
        repeated.state.toolRanges
      ).map(part => {
        if (part.type === 'resource') return part.resource.id;
        if (part.type === 'tool') return part.tool;
        return part.type;
      })
    ).toEqual(['text', 'r1', 'text', ToolType.WEB_SEARCH]);
    expect(repeated.selection).toEqual(webSearch?.selection);
  });

  it('updates a reselected resource in place and preserves the caret order', () => {
    const initial = createComposerState('分析一下');
    const withResource = insertComposerResource(
      initial,
      resource('r1', 'a.md'),
      { start: initial.displayText.length, end: initial.displayText.length },
      'Untitled'
    );
    const reasoning = toggleComposerTool(
      withResource.state,
      ToolType.REASONING,
      '深度思考',
      withResource.selection
    );
    expect(reasoning).not.toBeNull();

    const updated = insertComposerResource(
      reasoning?.state ?? withResource.state,
      resource('r1', 'renamed.md'),
      reasoning?.selection ?? withResource.selection,
      'Untitled'
    );
    const tokenLengthDelta =
      createResourceMentionText('renamed.md').length -
      createResourceMentionText('a.md').length;

    expect(updated.state.mentions).toMatchObject([
      {
        label: 'renamed.md',
        resource: { id: 'r1', name: 'renamed.md' },
        start: withResource.state.mentions[0].start,
      },
    ]);
    expect(updated.state.mentions).toHaveLength(1);
    expect(
      displayPartsFromComposerText(
        updated.state.displayText,
        updated.state.mentions,
        updated.state.toolRanges
      ).map(part => {
        if (part.type === 'resource') return part.resource.id;
        if (part.type === 'tool') return part.tool;
        return part.type;
      })
    ).toEqual(['text', 'r1', 'text', ToolType.REASONING]);
    expect(updated.selection).toEqual({
      start: (reasoning?.selection.start ?? 0) + tokenLengthDelta,
      end: (reasoning?.selection.end ?? 0) + tokenLengthDelta,
    });
  });

  it('collapses duplicate resource mentions restored from an older draft', () => {
    const initial = createComposerState('分析一下');
    const first = insertResourceMention(
      { text: initial.displayText, mentions: [] },
      resource('r1', 'plan.md'),
      { start: initial.displayText.length, end: initial.displayText.length },
      'Untitled'
    );
    const duplicate = insertResourceMention(
      first,
      resource('r1', 'plan.md'),
      first.selection,
      'Untitled'
    );
    const reasoning = toggleComposerTool(
      {
        displayText: duplicate.text,
        mentions: duplicate.mentions,
        toolRanges: [],
      },
      ToolType.REASONING,
      '深度思考',
      duplicate.selection
    );

    const synced = syncComposerResources(
      reasoning?.state ?? initial,
      [{ type: 'resource', resource: resource('r1', 'plan.md') }],
      'Untitled'
    );

    expect(synced.mentions).toHaveLength(1);
    expect(
      displayPartsFromComposerText(
        synced.displayText,
        synced.mentions,
        synced.toolRanges
      ).map(part => {
        if (part.type === 'resource') return part.resource.id;
        if (part.type === 'tool') return part.tool;
        return part.type;
      })
    ).toEqual(['text', 'r1', 'text', ToolType.REASONING]);
  });

  it('removes externally deleted resources without disturbing remaining tokens', () => {
    const initial = createComposerState('分析');
    const firstResource = insertComposerResource(
      initial,
      resource('r1', 'deleted.md'),
      { start: initial.displayText.length, end: initial.displayText.length },
      'Untitled'
    );
    const reasoning = toggleComposerTool(
      firstResource.state,
      ToolType.REASONING,
      '深度思考',
      firstResource.selection
    );
    const secondResource = insertComposerResource(
      reasoning?.state ?? firstResource.state,
      resource('r2', 'kept.md'),
      reasoning?.selection ?? firstResource.selection,
      'Untitled'
    );

    const synced = syncComposerResources(
      secondResource.state,
      [{ type: 'resource', resource: resource('r2', 'kept.md') }],
      'Untitled'
    );

    expect(synced.mentions).toMatchObject([{ resource: { id: 'r2' } }]);
    expect(
      displayPartsFromComposerText(
        synced.displayText,
        synced.mentions,
        synced.toolRanges
      ).map(part => {
        if (part.type === 'resource') return part.resource.id;
        if (part.type === 'tool') return part.tool;
        return part.type;
      })
    ).toEqual(['text', ToolType.REASONING, 'r2', 'text']);
  });
});
