import { queryFromComposerDisplayText } from './composerQuery';
import {
  type ComposerToolRange,
  createToolTokenText,
  deleteToolRange,
  insertToolRange,
  isVisibleComposerTool,
  removeToolRange,
  shiftToolRangesForReplacement,
  snapSelectionToToolBoundary,
  syncToolRangesWithTools,
  toolRangeAfterCaret,
  toolRangeBeforeCaret,
  toolRangeForDeletion,
  updateToolRangesForTextChange,
} from './composerToolTokens';
import { ToolType } from './types';

describe('composer tool tokens', () => {
  it('inserts a visible tool token at the selection and keeps it out of query text', () => {
    const doc = insertToolRange(
      { text: '你好', tools: [] },
      ToolType.WEB_SEARCH,
      'Web Search',
      { start: 2, end: 2 }
    );

    expect(doc.text).toBe(`你好${createToolTokenText('Web Search')}`);
    expect(doc.selection).toEqual({
      start: doc.text.length,
      end: doc.text.length,
    });
    expect(doc.tools).toMatchObject([
      {
        tool: ToolType.WEB_SEARCH,
        label: 'Web Search',
        start: 2,
        end: doc.text.length,
      },
    ]);
    expect(queryFromComposerDisplayText(doc.text, [], doc.tools)).toBe('你好');
  });

  it('keeps both tool ranges valid when visible tool tokens are inserted consecutively', () => {
    const withReasoning = insertToolRange(
      { text: '', tools: [] },
      ToolType.REASONING,
      '深度思考',
      { start: 0, end: 0 }
    );
    const withWebSearch = insertToolRange(
      withReasoning,
      ToolType.WEB_SEARCH,
      '联网搜索',
      withReasoning.selection
    );

    expect(withWebSearch.text).toBe(
      `${createToolTokenText('深度思考')}${createToolTokenText('联网搜索')}`
    );
    expect(
      withWebSearch.tools.map(range =>
        withWebSearch.text.slice(range.start, range.end)
      )
    ).toEqual([
      createToolTokenText('深度思考'),
      createToolTokenText('联网搜索'),
    ]);
    expect(
      queryFromComposerDisplayText(withWebSearch.text, [], withWebSearch.tools)
    ).toBe('');
  });

  it('keeps existing tool ranges valid when inserting a tool before them', () => {
    const withWebSearch = insertToolRange(
      { text: '', tools: [] },
      ToolType.WEB_SEARCH,
      '联网搜索',
      { start: 0, end: 0 }
    );
    const withReasoning = insertToolRange(
      withWebSearch,
      ToolType.REASONING,
      '深度思考',
      { start: 0, end: 0 }
    );

    expect(withReasoning.text).toBe(
      `${createToolTokenText('深度思考')}${createToolTokenText('联网搜索')}`
    );
    expect(
      withReasoning.tools.map(range =>
        withReasoning.text.slice(range.start, range.end)
      )
    ).toEqual([
      createToolTokenText('深度思考'),
      createToolTokenText('联网搜索'),
    ]);
    expect(
      queryFromComposerDisplayText(withReasoning.text, [], withReasoning.tools)
    ).toBe('');
  });

  it('shifts existing tool ranges when a resource mention is inserted before them', () => {
    const webSearchToken = createToolTokenText('联网搜索');
    const tools: ComposerToolRange[] = [
      {
        tool: ToolType.WEB_SEARCH,
        label: '联网搜索',
        start: 0,
        end: webSearchToken.length,
      },
    ];
    const resourceTokenLength = 7;
    const shifted = shiftToolRangesForReplacement(
      tools,
      { start: 0, end: 0 },
      resourceTokenLength
    );

    expect(shifted).toEqual([
      {
        ...tools[0],
        start: resourceTokenLength,
        end: resourceTokenLength + webSearchToken.length,
      },
    ]);
  });

  it('recovers a missing tool range when the token text is already present', () => {
    const reasoningToken = createToolTokenText('深度思考');
    const webSearchToken = createToolTokenText('联网搜索');
    const synced = syncToolRangesWithTools(
      {
        text: `${reasoningToken}${webSearchToken}`,
        tools: [
          {
            tool: ToolType.REASONING,
            label: '深度思考',
            start: 0,
            end: reasoningToken.length,
          },
        ],
      },
      [ToolType.REASONING, ToolType.WEB_SEARCH],
      tool => (tool === ToolType.REASONING ? '深度思考' : '联网搜索')
    );

    expect(synced?.text).toBe(`${reasoningToken}${webSearchToken}`);
    expect(
      synced?.tools.map(range => synced.text.slice(range.start, range.end))
    ).toEqual([reasoningToken, webSearchToken]);
    expect(
      queryFromComposerDisplayText(synced?.text ?? '', [], synced?.tools ?? [])
    ).toBe('');
  });

  it('repairs an existing tool range when its backing text is no longer a token', () => {
    const webSearchToken = createToolTokenText('联网搜索');
    const reasoningLabel = '深度思考';
    const reasoningToken = createToolTokenText(reasoningLabel);
    const synced = syncToolRangesWithTools(
      {
        text: `${webSearchToken}${reasoningLabel}`,
        tools: [
          {
            tool: ToolType.WEB_SEARCH,
            label: '联网搜索',
            start: 0,
            end: webSearchToken.length,
          },
          {
            tool: ToolType.REASONING,
            label: reasoningLabel,
            start: webSearchToken.length,
            end: webSearchToken.length + reasoningLabel.length,
          },
        ],
      },
      [ToolType.WEB_SEARCH, ToolType.REASONING],
      tool => (tool === ToolType.REASONING ? reasoningLabel : '联网搜索')
    );

    expect(synced?.text).toBe(`${webSearchToken}${reasoningToken}`);
    expect(
      synced?.tools.map(range => synced.text.slice(range.start, range.end))
    ).toEqual([webSearchToken, reasoningToken]);
    expect(
      queryFromComposerDisplayText(synced?.text ?? '', [], synced?.tools ?? [])
    ).toBe('');
  });

  it('shifts tool ranges when text is inserted before the token', () => {
    const token = createToolTokenText('Web Search');
    const tools: ComposerToolRange[] = [
      {
        tool: ToolType.WEB_SEARCH,
        label: 'Web Search',
        start: 2,
        end: 2 + token.length,
      },
    ];

    expect(
      updateToolRangesForTextChange(`你好${token}`, `hello 你好${token}`, tools)
    ).toMatchObject([
      {
        start: 8,
        end: 8 + token.length,
      },
    ]);
  });

  it('rejects edits inside a tool token range', () => {
    const token = createToolTokenText('Web Search');
    const tools: ComposerToolRange[] = [
      {
        tool: ToolType.WEB_SEARCH,
        label: 'Web Search',
        start: 2,
        end: 2 + token.length,
      },
    ];

    expect(
      updateToolRangesForTextChange(`你好${token}`, '你好Web Search', tools)
    ).toBeNull();
  });

  it('snaps caret navigation across atomic tool ranges', () => {
    const token = createToolTokenText('Web Search');
    const range: ComposerToolRange = {
      tool: ToolType.WEB_SEARCH,
      label: 'Web Search',
      start: 2,
      end: 2 + token.length,
    };

    expect(snapSelectionToToolBoundary({ start: 4, end: 4 }, [range])).toEqual({
      start: 2,
      end: 2,
    });
    expect(toolRangeBeforeCaret(range.end, [range])).toBe(range);
    expect(toolRangeAfterCaret(range.start, [range])).toBe(range);
  });

  it('finds the atomic tool token targeted by deletion keys', () => {
    const token = createToolTokenText('Web Search');
    const range: ComposerToolRange = {
      tool: ToolType.WEB_SEARCH,
      label: 'Web Search',
      start: 2,
      end: 2 + token.length,
    };

    expect(
      toolRangeForDeletion({ start: range.end, end: range.end }, 'Backspace', [
        range,
      ])
    ).toBe(range);
    expect(
      toolRangeForDeletion({ start: range.start, end: range.start }, 'Delete', [
        range,
      ])
    ).toBe(range);
    expect(
      toolRangeForDeletion(
        { start: range.start + 1, end: range.end - 1 },
        'Delete',
        [range]
      )
    ).toBe(range);
    expect(
      toolRangeForDeletion({ start: range.end, end: range.end }, 'Delete', [
        range,
      ])
    ).toBeUndefined();
  });

  it('removes a tool token as metadata without touching surrounding text', () => {
    const inserted = insertToolRange(
      { text: '你好世界', tools: [] },
      ToolType.REASONING,
      'Thinking',
      { start: 2, end: 2 }
    );
    const removed = removeToolRange(inserted, ToolType.REASONING);

    expect(removed.text).toBe('你好世界');
    expect(removed.tools).toEqual([]);
    expect(queryFromComposerDisplayText(removed.text, [], removed.tools)).toBe(
      '你好世界'
    );
  });

  it('deletes the targeted tool token and reports the removed tool', () => {
    const inserted = insertToolRange(
      { text: '你好世界', tools: [] },
      ToolType.WEB_SEARCH,
      'Web Search',
      { start: 2, end: 2 }
    );
    const removed = deleteToolRange(inserted, inserted.selection, 'Backspace');

    expect(removed).toMatchObject({
      text: '你好世界',
      tool: ToolType.WEB_SEARCH,
      tools: [],
      selection: { start: 2, end: 2 },
    });
  });

  it('treats private search as submit metadata instead of a visible token', () => {
    expect(isVisibleComposerTool(ToolType.PRIVATE_SEARCH)).toBe(false);
    expect(isVisibleComposerTool(ToolType.WEB_SEARCH)).toBe(true);
    expect(isVisibleComposerTool(ToolType.REASONING)).toBe(true);
  });
});
