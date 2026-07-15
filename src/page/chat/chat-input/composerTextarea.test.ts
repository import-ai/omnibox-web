import { composerTextLayoutClassName } from './composerLayout';
import { resizeComposer } from './composerTextarea';

function fakeElement(scrollHeight: number) {
  return {
    scrollHeight,
    style: {},
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
    const staleOverlay = fakeElement(180) as HTMLDivElement;

    (
      resizeComposer as (
        textarea: HTMLTextAreaElement | null,
        overlay: HTMLDivElement | null
      ) => void
    )(textarea, staleOverlay);

    expect(textarea.style.height).toBe('60px');
    expect(textarea.style.overflowY).toBe('hidden');
  });
});
