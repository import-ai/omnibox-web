import assert from 'node:assert/strict';

import { withoutMarkdownImages } from './chatImageMarkdown.ts';

assert.equal(
  withoutMarkdownImages('Before ![A \\[B\\]](</api/v1/image>) after'),
  'Before  after'
);
assert.equal(
  withoutMarkdownImages('![image][id]\n\n[id]: /api/v1/image\n\nText'),
  '\n\n\n\nText'
);
assert.equal(
  withoutMarkdownImages(
    '![nested [label]](https://example.com/a_(b).png) text'
  ),
  ' text'
);
assert.equal(
  withoutMarkdownImages('`![code](url)` and [link](url)'),
  '`![code](url)` and [link](url)'
);
console.log('Markdown image copy checks passed');
