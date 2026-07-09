import { resizeComposer } from './composerTextarea';

function fakeElement(scrollHeight: number) {
  return {
    scrollHeight,
    style: {},
  };
}

describe('composer textarea layout', () => {
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
