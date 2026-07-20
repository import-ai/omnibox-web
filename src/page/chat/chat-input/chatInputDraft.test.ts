import type { ResourceMeta } from '@/interface';

import {
  clearChatInputDraft,
  createChatInputDraft,
  getChatInputDraft,
  saveChatInputDraft,
} from './chatInputDraft';
import {
  insertComposerResource,
  toggleComposerTool,
} from './composerOperations';
import { displayPartsFromComposerText } from './composerQuery';
import { createComposerState } from './composerState';
import { ToolType } from './types';

function resource(): ResourceMeta {
  return {
    id: 'r1',
    name: 'plan.md',
    parent_id: null,
    resource_type: 'file',
    attrs: { original_name: 'plan.md' },
  };
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('chat input draft', () => {
  it('restores the exact resource and tool order and supports clearing', () => {
    const storage = memoryStorage();
    const initial = createComposerState('');
    const withResource = insertComposerResource(
      initial,
      resource(),
      { start: 0, end: 0 },
      'Untitled'
    );
    const reasoning = toggleComposerTool(
      withResource.state,
      ToolType.REASONING,
      '深度思考',
      withResource.selection
    );
    const webSearch = toggleComposerTool(
      reasoning?.state ?? withResource.state,
      ToolType.WEB_SEARCH,
      '联网搜索',
      reasoning?.selection ?? withResource.selection
    );
    const composerState = webSearch?.state ?? withResource.state;

    saveChatInputDraft('home:n1', createChatInputDraft(composerState), storage);

    const restored = getChatInputDraft('home:n1', storage);
    expect(restored).toEqual({
      query: '[plan.md](#r1) ',
      tools: [ToolType.REASONING, ToolType.WEB_SEARCH],
      composerState,
      selectedResources: [{ type: 'resource', resource: resource() }],
    });
    expect(
      displayPartsFromComposerText(
        restored?.composerState.displayText ?? '',
        restored?.composerState.mentions ?? [],
        restored?.composerState.toolRanges ?? []
      ).map(part => {
        if (part.type === 'resource') return part.resource.id;
        if (part.type === 'tool') return part.tool;
        return part.type;
      })
    ).toEqual(['r1', 'text', ToolType.REASONING, ToolType.WEB_SEARCH]);

    clearChatInputDraft('home:n1', storage);
    expect(getChatInputDraft('home:n1', storage)).toBeUndefined();
  });
});
