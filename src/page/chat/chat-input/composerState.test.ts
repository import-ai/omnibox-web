import { composerStateReducer, createComposerState } from './composerState';
import { ToolType } from './types';

describe('composer state', () => {
  it('replaces text and every token range in one state transition', () => {
    const initial = createComposerState('你好');
    const next = composerStateReducer(initial, {
      type: 'replace',
      state: {
        displayText: '你好联网搜索',
        mentions: [],
        toolRanges: [
          {
            tool: ToolType.WEB_SEARCH,
            label: '联网搜索',
            start: 2,
            end: 6,
          },
        ],
      },
    });

    expect(next).toEqual({
      displayText: '你好联网搜索',
      mentions: [],
      toolRanges: [
        {
          tool: ToolType.WEB_SEARCH,
          label: '联网搜索',
          start: 2,
          end: 6,
        },
      ],
    });
  });
});
