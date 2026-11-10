import {
  type ChatMessageDisplayPart,
  type ChatTool,
  type PrivateSearchResource,
  ToolType,
} from '../../chat-input/types';
import {
  collectUserMessageResourceIds,
  createUserMessageCopyHtml,
  formatUserContextResourceLabel,
  getUserMessageImages,
  getUserMessageResources,
  getUserMessageToolTokens,
  hasVisibleUserMessageResources,
  resourceMetaFromPrivateSearchResource,
  splitDisplayPartsByLine,
  splitUserMessageResourceTokens,
  withoutUserMessageImages,
} from './userMessageTokens';

describe('user message resource tokens', () => {
  const unnamedResources: PrivateSearchResource[] = [
    { id: 'r1', name: '', type: 'resource' },
    { id: 'r2', name: '', type: 'resource' },
  ];
  const unnamedTools: ChatTool[] = [
    { name: ToolType.PRIVATE_SEARCH, resources: unnamedResources },
  ];

  it('retains unnamed and same-name resources by ID', () => {
    const resources: PrivateSearchResource[] = [
      ...unnamedResources,
      { id: 'r3', name: 'same', type: 'resource' },
      { id: 'r4', name: 'same', type: 'resource' },
      unnamedResources[0],
    ];
    expect(
      getUserMessageResources([{ name: ToolType.PRIVATE_SEARCH, resources }])
        .map(resource => resource.id)
        .sort()
    ).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('restores unnamed history links with distinct resource identities', () => {
    expect(
      splitUserMessageResourceTokens(
        '[未命名](#r1) 和 [未命名](#r2) 请总结',
        getUserMessageResources(unnamedTools)
      )
    ).toEqual([
      { type: 'resource', text: '未命名', resource: unnamedResources[0] },
      { type: 'text', text: ' 和 ' },
      { type: 'resource', text: '未命名', resource: unnamedResources[1] },
      { type: 'text', text: ' 请总结' },
    ]);
  });

  it('matches explicit targets independently of the recorded resource name', () => {
    const resource: PrivateSearchResource = {
      id: 'r1',
      name: 'New title',
      type: 'resource',
    };
    expect(
      splitUserMessageResourceTokens('[Old title](#r1)', [resource])
    ).toEqual([{ type: 'resource', text: 'Old title', resource }]);
  });

  it('keeps ordinary untitled text intact when empty names are present', () => {
    const text = '未命名 是普通文字';
    expect(splitUserMessageResourceTokens(text, unnamedResources)).toEqual([
      { type: 'text', text },
    ]);
    expect(hasVisibleUserMessageResources(text, unnamedTools)).toBe(false);
  });

  it('uses explicit IDs for duplicate names and preserves ambiguous bare names', () => {
    const resources: PrivateSearchResource[] = [
      { id: 'r1', name: 'same', type: 'resource' },
      { id: 'r2', name: 'same', type: 'resource' },
    ];
    expect(
      splitUserMessageResourceTokens('[same](#r2) same', resources)
    ).toEqual([
      { type: 'resource', text: 'same', resource: resources[1] },
      { type: 'text', text: ' same' },
    ]);
  });

  it.each([
    '[doc.txt](#unknown)',
    '[doc.txt](#r1',
    '[doc.txt](https://example.com)',
    '[doc.txt](https://example.com/(x)/doc.txt)',
    '[outside [doc.txt]](#unknown)',
    '[doc.txt',
    '![doc.txt](https://example.com/(x)/doc.txt)',
    '[doc.txt](https://example.com/\\)doc.txt)',
  ])('preserves unrecognized or incomplete links: %s', text => {
    const resources: PrivateSearchResource[] = [
      { id: 'r1', name: 'doc.txt', type: 'resource' },
    ];
    expect(splitUserMessageResourceTokens(text, resources)).toEqual([
      { type: 'text', text },
    ]);
    expect(
      createUserMessageCopyHtml(text, [
        { name: ToolType.PRIVATE_SEARCH, resources },
      ])
    ).toBe(text);
  });

  it('keeps legacy names containing brackets and backslashes linkable', () => {
    for (const name of ['plan [draft]\\v2.md', '[draft].md']) {
      const resource: PrivateSearchResource = {
        id: 'r1',
        name,
        type: 'resource',
      };
      expect(splitUserMessageResourceTokens(name, [resource])).toEqual([
        { type: 'resource', text: name, resource },
      ]);
    }
  });

  it('hides the selected-resource tip when an unnamed link is actually visible', () => {
    expect(hasVisibleUserMessageResources('[未命名](#r1)', unnamedTools)).toBe(
      true
    );
  });

  it('preserves each unnamed resource ID in rich copy output', () => {
    const html = createUserMessageCopyHtml(
      '[未命名](#r1) [未命名](#r2)',
      unnamedTools
    );
    expect(html).toContain('data-resource-id="r1"');
    expect(html).toContain('data-resource-id="r2"');
    expect(html?.match(/data-label="未命名"/g)).toHaveLength(2);
    expect(html).not.toContain('](#');
  });

  it('renders persisted web search links inline without display cache or duplicate badges', () => {
    const text = 'Before [web_search](tool://web_search) after';
    expect(splitUserMessageResourceTokens(text, [])).toEqual([
      { type: 'text', text: 'Before ' },
      { type: 'tool', tool: ToolType.WEB_SEARCH },
      { type: 'text', text: ' after' },
    ]);
    for (const tools of [undefined, [{ name: ToolType.WEB_SEARCH }]]) {
      const html = createUserMessageCopyHtml(
        text,
        tools,
        false,
        () => '联网搜索'
      );
      expect(html).not.toContain('tool://');
      expect(html?.match(/data-chat-token="tool"/g)).toHaveLength(1);
      expect(html).toContain('Before <span');
      expect(html).toContain('</span> after');
    }
  });

  it('extracts conversation images and drops them from bubble parts', () => {
    const displayParts: ChatMessageDisplayPart[] = [
      {
        type: 'image',
        attachment_id: 'att-1',
        name: 'a.png',
        preview_url: '/preview/a.png',
      },
      { type: 'text', text: '这两个图片有啥区别?' },
      {
        type: 'image',
        attachment_id: 'att-2',
        name: 'b.png',
        preview_url: '/preview/b.png',
      },
    ];

    expect(splitDisplayPartsByLine(displayParts)).toEqual([[displayParts[1]]]);
    expect(getUserMessageImages(displayParts)).toEqual([
      displayParts[0],
      displayParts[2],
    ]);
    expect(withoutUserMessageImages(displayParts)).toEqual([
      { type: 'text', text: '这两个图片有啥区别?' },
    ]);
  });

  it('extracts private search resource names longest first', () => {
    expect(
      getUserMessageResources([
        { name: ToolType.WEB_SEARCH },
        {
          name: ToolType.PRIVATE_SEARCH,
          resources: [
            { id: '1', name: 'doc.txt', type: 'resource' },
            { id: '2', name: 'very-long-doc.txt', type: 'resource' },
          ],
        },
      ]).map(resource => resource.name)
    ).toEqual(['very-long-doc.txt', 'doc.txt']);
  });

  it('splits message text into text and resource token segments', () => {
    expect(
      splitUserMessageResourceTokens('ask very-long-doc.txt now', [
        { id: '1', name: 'doc.txt', type: 'resource' },
        { id: '2', name: 'very-long-doc.txt', type: 'resource' },
      ])
    ).toEqual([
      { type: 'text', text: 'ask ' },
      {
        type: 'resource',
        text: 'very-long-doc.txt',
        resource: { id: '2', name: 'very-long-doc.txt', type: 'resource' },
      },
      { type: 'text', text: ' now' },
    ]);
  });

  it('consumes resource markdown wrappers in persisted messages', () => {
    const resources: PrivateSearchResource[] = [
      {
        id: 'r1',
        name: 'plan [draft]\\v2.md',
        type: 'resource',
      },
    ];

    expect(
      splitUserMessageResourceTokens(
        'ask [plan \\[draft\\]\\\\v2.md](#r1) now',
        resources
      )
    ).toEqual([
      { type: 'text', text: 'ask ' },
      { type: 'resource', text: 'plan [draft]\\v2.md', resource: resources[0] },
      { type: 'text', text: ' now' },
    ]);
    expect(
      createUserMessageCopyHtml('ask [plan \\[draft\\]\\\\v2.md](#r1) now', [
        { name: ToolType.PRIVATE_SEARCH, resources },
      ])
    ).not.toContain('](#r1)');
  });

  it('creates copy html with resource token metadata', () => {
    expect(
      createUserMessageCopyHtml('ask doc.txt\nnow', [
        {
          name: ToolType.PRIVATE_SEARCH,
          resources: [{ id: '1', name: 'doc.txt', type: 'resource' }],
        },
      ])
    ).toBe(
      'ask <span contenteditable="false" data-chat-token="resource" data-label="doc.txt" data-resource-id="1" data-resource-name="doc.txt" data-resource-type="file" data-parent-id="" data-context-type="resource" title="doc.txt">doc.txt</span><br>now'
    );
  });

  it('keeps filename attrs for resource icons', () => {
    expect(
      resourceMetaFromPrivateSearchResource({
        id: '1',
        name: 'doc.pdf',
        type: 'resource',
      })
    ).toMatchObject({
      resource_type: 'file',
      attrs: { original_name: 'doc.pdf' },
    });
  });

  it('keeps link metadata for resource icons', () => {
    const resource: PrivateSearchResource = {
      id: '1',
      name: 'x.com/story',
      type: 'resource',
      resource_type: 'link',
      attrs: { url: 'https://x.com/story' },
    };
    const tools: ChatTool[] = [
      {
        name: ToolType.PRIVATE_SEARCH,
        resources: [resource],
      },
    ];

    expect(resourceMetaFromPrivateSearchResource(resource)).toMatchObject({
      resource_type: 'link',
      attrs: { url: 'https://x.com/story' },
    });

    expect(createUserMessageCopyHtml('x.com/story', tools)).toContain(
      'data-resource-type="link" data-parent-id="" data-context-type="resource" data-resource-url="https://x.com/story"'
    );
  });

  it('extracts visible tool tokens from message attrs', () => {
    expect(
      getUserMessageToolTokens([{ name: ToolType.WEB_SEARCH }], true)
    ).toEqual([ToolType.WEB_SEARCH, ToolType.REASONING]);
  });

  it('creates copy html with tool token metadata', () => {
    expect(
      createUserMessageCopyHtml(
        '你好你是谁',
        [{ name: ToolType.WEB_SEARCH }],
        false,
        tool => (tool === ToolType.WEB_SEARCH ? '联网搜索' : '深度思考')
      )
    ).toBe(
      '你好你是谁 <span contenteditable="false" data-chat-token="tool" data-tool-name="web_search" data-label="联网搜索" title="联网搜索">联网搜索</span>'
    );
  });

  it('creates copy html from composer display parts without reordering tokens', () => {
    const displayParts: ChatMessageDisplayPart[] = [
      { type: 'tool', tool: ToolType.WEB_SEARCH },
      { type: 'tool', tool: ToolType.REASONING },
      {
        type: 'resource',
        resource: { id: '1', name: 'doc.md', type: 'resource' },
      },
      { type: 'text', text: '帮我总结' },
    ];

    expect(
      createUserMessageCopyHtml(
        'doc.md帮我总结',
        [{ name: ToolType.WEB_SEARCH }],
        true,
        tool => (tool === ToolType.WEB_SEARCH ? '联网搜索' : '深度思考'),
        displayParts
      )
    ).toBe(
      '<span contenteditable="false" data-chat-token="tool" data-tool-name="web_search" data-label="联网搜索" title="联网搜索">联网搜索</span><span contenteditable="false" data-chat-token="tool" data-tool-name="reasoning" data-label="深度思考" title="深度思考">深度思考</span><span contenteditable="false" data-chat-token="resource" data-label="doc.md" data-resource-id="1" data-resource-name="doc.md" data-resource-type="file" data-parent-id="" data-context-type="resource" title="doc.md">doc.md</span>帮我总结'
    );
  });

  it('detects visible resources from display parts including folders', () => {
    expect(
      hasVisibleUserMessageResources('总结一下', undefined, [
        {
          type: 'resource',
          resource: { id: '1', name: 'docs', type: 'folder' },
        },
        { type: 'text', text: '总结一下' },
      ])
    ).toBe(true);
  });

  it('detects visible resources from content name matching', () => {
    expect(
      hasVisibleUserMessageResources('ask doc.txt', [
        {
          name: ToolType.PRIVATE_SEARCH,
          resources: [{ id: '1', name: 'doc.txt', type: 'resource' }],
        },
      ])
    ).toBe(true);
  });

  it('returns false when tools have resources but bubble has no pills', () => {
    expect(
      hasVisibleUserMessageResources('hello', [
        {
          name: ToolType.PRIVATE_SEARCH,
          resources: [{ id: '1', name: 'doc.txt', type: 'resource' }],
        },
      ])
    ).toBe(false);
  });

  it('collects selected resource ids for name lookup', () => {
    expect(
      collectUserMessageResourceIds(
        [{ id: '1', name: 'doc.txt', type: 'resource' }],
        ['OKLzi2M2lWfgvhJb', '/private/docs']
      )
    ).toEqual(['1', 'OKLzi2M2lWfgvhJb']);
  });

  it('formats user context labels with resource names', () => {
    const t = ((key: string) => key) as never;
    expect(
      formatUserContextResourceLabel(
        'OKLzi2M2lWfgvhJb',
        { OKLzi2M2lWfgvhJb: '第一层 abc' },
        t
      )
    ).toBe('第一层 abc');
  });

  it('hides unresolved resource ids until names are available', () => {
    const t = ((key: string) => key) as never;
    expect(
      formatUserContextResourceLabel('OKLzi2M2lWfgvhJb', {}, t)
    ).toBeNull();
  });
});
