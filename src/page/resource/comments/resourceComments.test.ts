/** @jest-environment jsdom */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const postcss = jest.requireActual<typeof import('postcss').default>('postcss');
const tailwindcss =
  jest.requireActual<typeof import('tailwindcss')>('tailwindcss');
const loadConfig = jest.requireActual<typeof import('tailwindcss/loadConfig')>(
  'tailwindcss/loadConfig'
);

describe('compiled resource comment styles', () => {
  it('keeps the shared panel out of the document flow', async () => {
    const panel = document.createElement('div');
    panel.className = 'resource-comments-panel absolute';
    const config = loadConfig(resolve('tailwind.config.js'));
    const css = readFileSync(
      'src/page/resource/comments/resourceComments.css',
      'utf8'
    );
    const result = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: panel.outerHTML, extension: 'html' }],
      }),
    ]).process(`@tailwind utilities;\n${css}`, { from: undefined });
    const positions: string[] = [];
    result.root.walkRules(rule => {
      if (panel.matches(rule.selector)) {
        rule.walkDecls('position', declaration => {
          positions.push(declaration.value);
        });
      }
    });

    expect(positions).toContain('absolute');
    expect(positions).not.toContain('relative');
  });
});
