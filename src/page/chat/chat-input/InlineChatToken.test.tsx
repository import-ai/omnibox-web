import { renderToStaticMarkup } from 'react-dom/server';

import type { ResourceMeta } from '@/interface';

import { resourceTokenSpacer } from './composerDocument';
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
        spacer={resourceTokenSpacer}
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
        spacer={resourceTokenSpacer}
      >
        note.md
      </InlineChatToken>
    );

    expect(html).not.toContain('lucide-folder');
    expect(html).toContain('remixicon');
  });

  it('renders the icon inline before the label when no spacer is provided', () => {
    const html = renderToStaticMarkup(
      <InlineChatToken
        icon="resource"
        resource={markdownResource()}
        contextType="resource"
      >
        note.md
      </InlineChatToken>
    );

    expect(html).toContain('mr-1');
    expect(html).not.toContain('absolute');
    expect(html).not.toContain('text-transparent');
    expect(html).toContain('note.md');
  });

  it('opens a read-only resource token link in a new tab', () => {
    const html = renderToStaticMarkup(
      <InlineChatToken
        icon="resource"
        resource={markdownResource()}
        contextType="resource"
        href="/n1/r1"
      >
        note.md
      </InlineChatToken>
    );

    expect(html).toContain('<a');
    expect(html).toContain('href="/n1/r1"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('uses the editable spacer for layout while the icon stays out of flow', () => {
    const html = renderToStaticMarkup(
      <InlineChatToken
        icon="resource"
        resource={markdownResource()}
        contextType="resource"
        spacer={resourceTokenSpacer}
      >
        https://example.com/a_very_long_resource_name_without_spaces
      </InlineChatToken>
    );

    expect(html).toContain(resourceTokenSpacer);
    expect(html).toContain('absolute');
    expect(html).not.toContain('break-all');
    expect(html).not.toContain('mr-1');
    expect(html).not.toContain('mx-0.5');
    expect(html).not.toContain('overflow-wrap:anywhere');
  });
});
