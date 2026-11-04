/** @jest-environment jsdom */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { CommentMentionField } from './CommentMentionField';
import { userMentionShortcode } from './commentMentions';
import { useCommentMentionInput } from './useCommentMentionInput';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('./useCommentMentionUsers', () => ({
  useCommentMentionUsers: () => ({
    users: [],
    namesById: { alice: 'Alice', bob: 'Bob' },
  }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const sourceStyles = postcss.parse(
  readFileSync(
    resolve('src/page/resource/comments/resourceComments.css'),
    'utf8'
  )
);
const alice = userMentionShortcode('alice', 'Alice');
const bob = userMentionShortcode('bob', 'Bob');

function Fixture({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const mention = useCommentMentionInput(value, setValue);
  return (
    <>
      <CommentMentionField display={mention.displayValue} atoms={mention.atoms}>
        <textarea value={mention.displayValue} {...mention.inputProps} />
      </CommentMentionField>
      <output>{value}</output>
    </>
  );
}

describe.each([
  ['light', 'rgb(20, 20, 20)'],
  ['dark', 'rgb(245, 245, 245)'],
])('CommentMentionField during IME input (%s)', (_theme, foreground) => {
  let root: Root;
  let container: HTMLDivElement;
  let style: HTMLStyleElement;
  let textarea: HTMLTextAreaElement;
  let mirror: HTMLDivElement;

  beforeEach(() => {
    // Resolve theme tokens so jsdom exercises the real field selectors and cascade.
    const tokens: Record<string, string> = {
      '--foreground': foreground,
      '--muted-foreground': 'rgb(128, 128, 128)',
      '--tt-brand-color-500': 'rgb(0, 144, 255)',
    };
    const rules: string[] = [];
    sourceStyles.walkRules(rule => {
      if (rule.selector.startsWith('.omnibox-comment-mention')) {
        rules.push(
          rule
            .toString()
            .replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (_match, key) => {
              return tokens[key];
            })
        );
      }
    });
    style = document.createElement('style');
    style.textContent = rules.join('\n');
    document.head.append(style);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    style.remove();
  });

  const render = (initial: string) => {
    act(() => root.render(<Fixture initial={initial} />));
    textarea = container.querySelector('textarea')!;
    mirror = container.querySelector('.omnibox-comment-mention-field__mirror')!;
    textarea.focus();
  };

  const compose = (type: string, data = '') => {
    act(() => {
      textarea.dispatchEvent(
        new CompositionEvent(type, { bubbles: true, data })
      );
    });
  };

  const input = (value: string, composing: boolean) => {
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )!.set!.call(textarea, value);
      textarea.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: composing ? 'insertCompositionText' : 'insertText',
          isComposing: composing,
        })
      );
    });
    expect(textarea.value).toBe(value);
    expect(mirror.textContent).toBe(value);
  };

  const expectHighlight = (names: string[]) => {
    expect(getComputedStyle(mirror).visibility).toBe('visible');
    expect(getComputedStyle(mirror).color).toBe(foreground);
    expect(getComputedStyle(textarea).color).toBe('transparent');
    expect(document.activeElement).toBe(textarea);
    const mentions = Array.from(
      mirror.querySelectorAll('.omnibox-comment-mention')
    );
    expect(mentions.map(mention => mention.textContent)).toEqual(names);
    for (const mention of mentions) {
      expect(getComputedStyle(mention).color).toBe('rgb(0, 144, 255)');
    }
  };

  it('keeps a mention blue through consecutive preedit and commit cycles', () => {
    render(`${alice} `);
    let committed = '@Alice ';
    for (const [preedit, text] of [
      ['ni', '你'],
      ['hao', '好'],
    ]) {
      compose('compositionstart');
      expectHighlight(['@Alice']);
      compose('compositionupdate', preedit);
      input(committed + preedit, true);
      expectHighlight(['@Alice']);
      compose('compositionend', text);
      input(committed + text, false);
      committed += text;
      expectHighlight(['@Alice']);
    }
    expect(container.querySelector('output')!.textContent).toBe(
      `${alice} 你好`
    );
  });

  it.each([
    ['before', '', '@Alice @Bob'],
    ['between', '@Alice ', '@Bob'],
    ['after', '@Alice @Bob ', ''],
  ])(
    'preserves both mentions when composing %s them',
    (_where, prefix, suffix) => {
      const initial = prefix + suffix;
      render(initial.replace('@Alice', alice).replace('@Bob', bob));
      compose('compositionstart');
      input(`${prefix}zhong${suffix}`, true);
      expectHighlight(['@Alice', '@Bob']);
      compose('compositionend', '中');
      input(`${prefix}中${suffix}`, false);
      expectHighlight(['@Alice', '@Bob']);
      const storage = container.querySelector('output')!.textContent!;
      expect(storage).toContain(alice);
      expect(storage).toContain(bob);
      expect(storage).not.toContain('zhong');
    }
  );

  it('keeps the existing mention and text when preedit is cancelled', () => {
    render(`${alice} hello`);
    compose('compositionstart');
    input('@Alice helloni', true);
    compose('compositionend');
    input('@Alice hello', false);
    expectHighlight(['@Alice']);
    expect(container.querySelector('output')!.textContent).toBe(
      `${alice} hello`
    );
    textarea.scrollTop = 40;
    act(() => textarea.dispatchEvent(new Event('scroll', { bubbles: true })));
    expect(mirror.scrollTop).toBe(40);
  });
});
