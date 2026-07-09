import { renderToStaticMarkup } from 'react-dom/server';

import type { ResourceMeta } from '@/interface';

import { InlineChatToken } from './InlineChatToken';

function markdownResource(): ResourceMeta {
  return {
    id: 'r1',
    name: 'note.md',
    parent_id: null,
    resource_type: 'file',
    attrs: { original_name: 'note.md' },
  };
}

describe('InlineChatToken', () => {
  it('uses the folder icon when a resource token represents all files in a folder', () => {
    const html = renderToStaticMarkup(
      <InlineChatToken
        icon="resource"
        resource={markdownResource()}
        contextType="folder"
      >
        note.md
      </InlineChatToken>
    );

    expect(html).toContain('lucide-folder');
  });

  it('keeps the original file icon when a resource token represents the file itself', () => {
    const html = renderToStaticMarkup(
      <InlineChatToken
        icon="resource"
        resource={markdownResource()}
        contextType="resource"
      >
        note.md
      </InlineChatToken>
    );

    expect(html).not.toContain('lucide-folder');
    expect(html).toContain('remixicon');
  });
});
