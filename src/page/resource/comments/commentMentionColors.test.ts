/** @jest-environment jsdom */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';

const styles = postcss.parse(
  readFileSync(
    resolve('src/page/resource/comments/resourceComments.css'),
    'utf8'
  )
);

describe.each([
  ['light', 'rgb(20, 20, 20)', 'rgb(110, 110, 110)'],
  ['dark', 'rgb(245, 245, 245)', 'rgb(180, 180, 180)'],
])(
  'comment mention field colors in the %s theme',
  (_theme, foreground, muted) => {
    it.each([
      ['.omnibox-comment-mention-field__mirror', 'color', '--foreground'],
      [
        '.omnibox-comment-mention-field > textarea',
        'caret-color',
        '--foreground',
      ],
      [
        '.omnibox-comment-mention-field.is-composing > textarea',
        'color',
        '--foreground',
      ],
      [
        '.omnibox-comment-mention-field > textarea::placeholder',
        'color',
        '--muted-foreground',
      ],
    ])(
      'keeps %s %s visible with complete color tokens',
      (selector, property, token) => {
        let value: string | undefined;
        styles.walkRules(selector, rule => {
          rule.walkDecls(property, declaration => {
            value = declaration.value;
          });
        });
        expect(value).toBeDefined();
        const colors: Record<string, string> = {
          '--foreground': foreground,
          '--muted-foreground': muted,
        };
        const resolved = value!.replace(
          /var\((--[a-z-]+)\)/g,
          (_match, name: string) => colors[name]
        );
        // Validate the resolved color through CSSOM; nested color functions are invalid.
        const sample = document.createElement('span');
        sample.style.color = resolved;
        expect(sample.style.color).toBe(colors[token]);
      }
    );
  }
);
