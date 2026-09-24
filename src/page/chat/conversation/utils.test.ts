/** @jest-environment-options {"customExportConditions": ["browser"]} */

jest.mock('@/const', () => ({
  FORCE_PRIVATE_SEARCH: false,
}));

jest.mock('@/lib/streamTransport', () => ({
  createStreamTransport: jest.fn(),
}));

jest.mock('@/lib/request', () => ({
  http: {},
}));

import { webcrypto } from 'node:crypto';

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

  it('creates pending and error message UUIDs without crypto.randomUUID', async () => {
    const originalCrypto = Object.getOwnPropertyDescriptor(
      globalThis,
      'crypto'
    );
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
    });
    try {
      const operator = {
        add: jest.fn(),
        update: jest.fn(),
        error: jest.fn(),
      } as unknown as MessageOperator;
      (createStreamTransport as jest.Mock).mockImplementation(
        (_url, _body, onData) => ({
          start: async () => {
            await onData(
              JSON.stringify({
                response_type: 'bos',
                role: OpenAIMessageRole.USER,
                id: 'accepted-user',
                parentId: '',
              })
            );
            throw new Error('Connection lost');
          },
        })
      );
      await ask(
        'c1',
        'Hi',
        [],
        [],
        AgentRequestChannel.WEB,
        undefined,
        operator,
        '/ask',
        undefined,
        'n1',
        undefined,
        undefined
      ).start();

      const messages = (operator.add as jest.Mock).mock.calls.map(
        ([message]) => message
      );
      const pending = messages.find(message => message.attrs?.pending_query);
      const assistant = messages.find(
        message => message.role === OpenAIMessageRole.ASSISTANT
      );
      const uuidV4 =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(pending.id).toMatch(uuidV4);
      expect(pending.attrs.client_request_id).toBe(pending.id);
      expect(assistant.id).toMatch(uuidV4);
      expect(assistant.id).not.toBe(pending.id);
      expect(operator.error).toHaveBeenCalledWith(
        { response_type: 'error', message: 'Connection lost' },
        assistant.id
      );
    } finally {
      if (originalCrypto)
        Object.defineProperty(globalThis, 'crypto', originalCrypto);
      else Reflect.deleteProperty(globalThis, 'crypto');
      (createStreamTransport as jest.Mock).mockReset();
    }
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

  it('includes the current resource without changing selected resources', () => {
    expect(
      prepareBody(
        'c1',
        '总结当前资源',
        [],
        [selectedResource()],
        AgentRequestChannel.WEB,
        undefined,
        '简体中文',
        false,
        'current-resource'
      )
    ).toMatchObject({
      current_resource_id: 'current-resource',
      tools: [{ name: ToolType.PRIVATE_SEARCH }],
    });
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

  it('forwards conversation images on the wizard request body', () => {
    const images = [
      {
        attachment_id: 'att-1',
        url: '/api/v1/namespaces/n1/conversations/c1/attachments/att-1',
        name: 'IMG_8769.PNG',
      },
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
      '这个图片里有什么？',
      [],
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
      [
        { type: 'text', text: '这个图片里有什么？' },
        {
          type: 'image',
          attachment_id: 'att-1',
          name: 'IMG_8769.PNG',
          preview_url: images[0].url,
        },
      ],
      undefined,
      undefined,
      images
    );

    const [, requestBody] = (createStreamTransport as jest.Mock).mock.calls[0];
    expect(requestBody.images).toEqual(images);
    expect(requestBody.query).toBe('这个图片里有什么？');
  });
});

describe('thinking selection request', () => {
  it('forwards opaque selection without legacy or model parameters', () => {
    for (const level of ['low', 'high', 'ultra']) {
      const body = prepareBody(
        'c1',
        'Hi',
        [ToolType.REASONING],
        [],
        AgentRequestChannel.WEB,
        undefined,
        'English',
        true,
        undefined,
        'basic',
        level
      );
      expect(body).toMatchObject({ edition: 'basic', level });
      expect(body).not.toHaveProperty('enable_thinking');
      expect(body).not.toHaveProperty('model');
      expect(body).not.toHaveProperty('parameters');
      expect(body).not.toHaveProperty('reasoning_effort');
    }
  });
});
