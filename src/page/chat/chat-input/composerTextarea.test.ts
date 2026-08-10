import { composerTextLayoutClassName } from './composerLayout';
import { resizeComposer } from './composerTextarea';

function fakeElement(scrollHeight: number, clientWidth = 120) {
  return {
    scrollHeight,
    clientWidth,
    style: {} as CSSStyleDeclaration,
  };
}

describe('composer textarea layout', () => {
  it('uses one explicit wrapping contract for the textarea and overlay', () => {
    expect(composerTextLayoutClassName).toContain('whitespace-pre-wrap');
    expect(composerTextLayoutClassName).toContain('break-words');
    expect(composerTextLayoutClassName).toContain('[word-break:normal]');
    expect(composerTextLayoutClassName).not.toContain('break-all');
  });

  it('shrinks from stale overlay height after tokens are deleted', () => {
    const textarea = fakeElement(60) as HTMLTextAreaElement;

    resizeComposer(textarea);

    expect(textarea.style.height).toBe('60px');
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('skips measuring while the textarea width is still 0', () => {
    const textarea = fakeElement(400, 0) as HTMLTextAreaElement;
    textarea.style.height = '';

    resizeComposer(textarea);

    expect(textarea.style.height).toBe('');
  });
});
