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
  getUserMessageResources,
  getUserMessageToolTokens,
  hasVisibleUserMessageResources,
  resourceMetaFromPrivateSearchResource,
  splitUserMessageResourceTokens,
} from './userMessageTokens';

describe('user message resource tokens', () => {
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
        'doc.txt',
        'very-long-doc.txt',
      ])
    ).toEqual([
      { type: 'text', text: 'ask ' },
      { type: 'resource', text: 'very-long-doc.txt' },
      { type: 'text', text: ' now' },
    ]);
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
