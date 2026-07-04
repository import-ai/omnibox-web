import { ToolType } from '../../chat-input/types';
import {
  createUserMessageCopyHtml,
  getUserMessageResourceNames,
  splitUserMessageResourceTokens,
} from './userMessageTokens';

describe('user message resource tokens', () => {
  it('extracts private search resource names longest first', () => {
    expect(
      getUserMessageResourceNames([
        { name: ToolType.WEB_SEARCH },
        {
          name: ToolType.PRIVATE_SEARCH,
          resources: [
            { id: '1', name: 'doc.txt', type: 'resource' },
            { id: '2', name: 'very-long-doc.txt', type: 'resource' },
          ],
        },
      ])
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
});
