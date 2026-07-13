import type { ResourceMeta } from '@/interface';

import {
  createResourceMentionText,
  insertResourceMention,
  updateMentionsForTextChange,
} from './composerDocument';
import { deleteComposerSelection } from './composerSelection';
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

describe('composer selection deletion', () => {
  it('deletes every selected resource and tool token on full selection', () => {
    const first = insertResourceMention(
      { text: '你好  再见', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 3, end: 3 },
      'Untitled'
    );
    const second = insertResourceMention(
      first,
      resource('r2', 'todo.md'),
      { start: first.text.length, end: first.text.length },
      'Untitled'
    );
    const withTool = insertToolRange(
      { text: second.text, tools: [] },
      ToolType.WEB_SEARCH,
      'Web Search',
      { start: second.text.length, end: second.text.length }
    );
    const mentions = updateMentionsForTextChange(
      second.text,
      withTool.text,
      second.mentions
    );
    expect(mentions).not.toBeNull();

    const deleted = deleteComposerSelection(
      { text: withTool.text, mentions: mentions ?? [], tools: withTool.tools },
      { start: 0, end: withTool.text.length }
    );

    expect(deleted).toEqual({
      text: '',
      mentions: [],
      tools: [],
      removedTools: [ToolType.WEB_SEARCH],
      selection: { start: 0, end: 0 },
    });
  });

  it('expands a selected range to full token boundaries and shifts suffix tokens', () => {
    const first = insertResourceMention(
      { text: 'A  B  C', mentions: [] },
      resource('r1', 'plan.md'),
      { start: 2, end: 2 },
      'Untitled'
    );
    const second = insertResourceMention(
      first,
      resource('r2', 'todo.md'),
      { start: first.text.length - 2, end: first.text.length - 2 },
      'Untitled'
    );
    const tool = insertToolRange(
      { text: second.text, tools: [] },
      ToolType.REASONING,
      'Thinking',
      { start: second.text.length, end: second.text.length }
    );
    const mentions = updateMentionsForTextChange(
      second.text,
      tool.text,
      second.mentions
    );
    expect(mentions).not.toBeNull();
    const [firstMention, secondMention] = mentions ?? [];

    const deleted = deleteComposerSelection(
      { text: tool.text, mentions: mentions ?? [], tools: tool.tools },
      { start: firstMention.start + 1, end: secondMention.end - 1 }
    );

    expect(deleted?.text).toBe(`A  C${createToolTokenText('Thinking')}`);
    expect(deleted?.mentions).toEqual([]);
    expect(deleted?.tools).toMatchObject([
      {
        tool: ToolType.REASONING,
        start: 4,
        end: 4 + createToolTokenText('Thinking').length,
      },
    ]);
    expect(deleted?.selection).toEqual({ start: 2, end: 2 });
    expect(deleted?.text.includes(createResourceMentionText('plan.md'))).toBe(
      false
    );
  });
});
