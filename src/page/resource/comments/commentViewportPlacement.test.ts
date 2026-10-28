import { commentViewportPlacement } from './commentViewportPlacement';

describe('comment viewport placement', () => {
  const viewTop = 100;
  const viewBottom = 500;

  it('treats a card below the window as below', () => {
    expect(
      commentViewportPlacement({ top: 500, bottom: 620 }, viewTop, viewBottom)
    ).toBe('below');
  });

  it('treats a card above the window as above', () => {
    expect(
      commentViewportPlacement({ top: 0, bottom: 100 }, viewTop, viewBottom)
    ).toBe('above');
  });

  it('treats any overlap as visible', () => {
    expect(
      commentViewportPlacement({ top: 480, bottom: 600 }, viewTop, viewBottom)
    ).toBe('visible');
  });
});
