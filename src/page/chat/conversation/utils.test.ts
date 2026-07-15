jest.mock('@/const', () => ({
  FORCE_PRIVATE_SEARCH: false,
}));

jest.mock('@/lib/streamTransport', () => ({
  createStreamTransport: jest.fn(),
}));

jest.mock('@/lib/request', () => ({
  http: {},
}));

import { createStreamTransport } from '@/lib/streamTransport';
import {
  AgentRequestChannel,
  type ChatMessageDisplayPart,
  type IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types';
import type { MessageOperator } from '@/page/chat/core/messageOperator';
import { OpenAIMessageRole } from '@/page/chat/core/types/chatResponse';
import { getCachedMessageDisplayParts } from '@/page/chat/messages/messageDisplayPartsCache';

import { ask, prepareBody } from './utils';

const sessionValues = new Map<string, string>();
const sessionStorageMock: Storage = {
  get length() {
    return sessionValues.size;
  },
  clear: () => sessionValues.clear(),
  getItem: key => sessionValues.get(key) ?? null,
  key: index => Array.from(sessionValues.keys())[index] ?? null,
  removeItem: key => sessionValues.delete(key),
  setItem: (key, value) => sessionValues.set(key, value),
};
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
});

function selectedResource(): IResTypeContext {
  return {
    type: 'resource',
    resource: {
      id: 'r1',
      name: 'plan.md',
      parent_id: null,
      resource_type: 'file',
      attrs: { original_name: 'plan.md' },
    },
  };
}

describe('chat request body tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('includes web search when the web search token is selected', () => {
    expect(
      prepareBody(
        'c1',
        '你好你是谁',
        [ToolType.WEB_SEARCH],
        [],
        AgentRequestChannel.WEB,
        undefined,
        '简体中文'
      )
    ).toMatchObject({
      query: '你好你是谁',
      tools: [{ name: ToolType.WEB_SEARCH }],
      enable_thinking: false,
    });
  });

  it('enables thinking when the reasoning token is selected', () => {
    expect(
      prepareBody(
        'c1',
        '分析一下',
        [ToolType.REASONING],
        [],
        AgentRequestChannel.WEB,
        undefined,
        '简体中文'
      )
    ).toMatchObject({
      query: '分析一下',
      enable_thinking: true,
    });
  });

  it('adds private search when resources are selected', () => {
    expect(
      prepareBody(
        'c1',
        '总结 plan.md',
        [],
        [selectedResource()],
        AgentRequestChannel.WEB,
        undefined,
        '简体中文'
      ).tools
    ).toEqual([
      {
        name: ToolType.PRIVATE_SEARCH,
        resources: [
          {
            id: 'r1',
            name: 'plan.md',
            type: 'resource',
            resource_type: 'file',
            attrs: { original_name: 'plan.md' },
          },
        ],
      },
    ]);
  });

  it('keeps composer display parts in frontend attrs and the refresh cache', async () => {
    const displayParts: ChatMessageDisplayPart[] = [
      { type: 'tool', tool: ToolType.WEB_SEARCH },
      { type: 'text', text: '你好' },
    ];
    const messageOperator: MessageOperator = {
      update: jest.fn(),
      add: jest.fn(),
      done: jest.fn(),
      stop: jest.fn(),
      error: jest.fn(),
      activate: jest.fn(),
      getSiblings: jest.fn(() => []),
      getParent: jest.fn(() => ''),
    };

    ask(
      'c1',
      '你好',
      [ToolType.WEB_SEARCH],
      [],
      AgentRequestChannel.WEB,
      undefined,
      messageOperator,
      '/ask',
      '简体中文',
      'n1',
      undefined,
      undefined,
      undefined,
      undefined,
      displayParts
    );

    const [, requestBody, onData] = (createStreamTransport as jest.Mock).mock
      .calls[0];
    await onData(
      JSON.stringify({
        response_type: 'bos',
        role: OpenAIMessageRole.USER,
        id: 'u1',
        parentId: '',
      })
    );

    expect(requestBody).not.toHaveProperty('displayParts');
    expect(messageOperator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        attrs: {
          composer: {
            display_parts: displayParts,
          },
        },
      }),
      'u1'
    );
    expect(getCachedMessageDisplayParts('u1')).toEqual(displayParts);
  });
});
