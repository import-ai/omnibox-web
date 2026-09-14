import { getCommentDraftPosition } from './commentDraftPosition';

describe('comment draft alignment', () => {
  const selection = { from: 5, to: 12 };
  const original = { range: { from: 1, to: 20 }, top: 460, bottom: 580 };

  it('brings later cards back from old stacked positions to immediately below the draft', () => {
    const cards = [
      { range: { from: 1, to: 4 }, anchorTop: 440, top: 330, bottom: 442 },
      { range: { from: 25, to: 30 }, anchorTop: 490, top: 1100, bottom: 1212 },
      { range: { from: 40, to: 45 }, anchorTop: 515, top: 1220, bottom: 1332 },
    ];
    const position = getCommentDraftPosition(selection, 470, cards, 160);
    expect(position.top).toBe(470);
    expect(
      cards.map((card, index) => card.top + position.cardOffsets[index])
    ).toEqual([350, 638, 758]);
  });

  it('uses document order when previous navigation displaced the cards', () => {
    const later = {
      range: { from: 40, to: 45 },
      anchorTop: 515,
      top: 100,
      bottom: 212,
    };
    const earlier = {
      range: { from: 25, to: 30 },
      anchorTop: 490,
      top: 800,
      bottom: 912,
    };
    const position = getCommentDraftPosition(
      selection,
      470,
      [later, earlier],
      160
    );
    expect(earlier.top + position.cardOffsets[1]).toBe(638);
    expect(later.top + position.cardOffsets[0]).toBe(758);
  });

  it('aligns a partial reselection and moves the existing card above it', () => {
    const position = getCommentDraftPosition(selection, 470, [original], 180);
    expect(position.top).toBe(470);
    expect(original.bottom + position.cardOffsets[0]).toBe(position.top - 8);
  });

  it('keeps the fifth draft aligned instead of pushing it below four old cards', () => {
    const cards = Array.from({ length: 4 }, (_, index) => ({
      ...original,
      top: 460 + index * 128,
      bottom: 580 + index * 128,
    }));
    const position = getCommentDraftPosition(selection, 470, cards, 180);
    expect(position.top).toBe(470);
    expect(cards[3].bottom + position.cardOffsets[3]).toBe(462);
    expect(position.top + 180).toBeLessThan(720);
  });

  it('handles overlapping threads regardless of card order', () => {
    const second = { range: { from: 10, to: 25 }, top: 588, bottom: 720 };
    const position = getCommentDraftPosition(
      selection,
      470,
      [second, original],
      180
    );
    expect(position.top).toBe(470);
    expect(second.bottom + position.cardOffsets[0]).toBe(462);
  });

  it('keeps distant comments in place', () => {
    const other = { range: { from: 50, to: 70 }, top: 1000, bottom: 1120 };
    const position = getCommentDraftPosition(
      selection,
      470,
      [original, other],
      180
    );
    expect(position.cardOffsets).toEqual([-118, 0]);
  });

  it('inserts a draft after the preceding quote and before later quotes', () => {
    const before = { range: { from: 1, to: 4 }, top: 460, bottom: 580 };
    const following = { range: { from: 25, to: 30 }, top: 588, bottom: 708 };
    const last = { range: { from: 40, to: 45 }, top: 716, bottom: 836 };
    const position = getCommentDraftPosition(
      selection,
      470,
      [before, following, last],
      180
    );
    expect(position.top).toBe(470);
    expect(before.bottom + position.cardOffsets[0]).toBe(462);
    expect(following.top + position.cardOffsets[1]).toBe(658);
    expect(last.top + position.cardOffsets[2]).toBe(786);
  });

  it('keeps a longer draft between the preceding and following comments', () => {
    const following = { range: { from: 25, to: 30 }, top: 588, bottom: 708 };
    const position = getCommentDraftPosition(
      selection,
      470,
      [following, original],
      280
    );
    expect(position.top).toBe(470);
    expect(original.bottom + position.cardOffsets[1]).toBe(462);
    expect(following.top + position.cardOffsets[0]).toBe(758);
  });

  it('recalculates the shift when an existing card grows', () => {
    const larger = { ...original, bottom: 650 };
    const position = getCommentDraftPosition(selection, 470, [larger], 180);
    expect(position.top).toBe(470);
    expect(larger.bottom + position.cardOffsets[0]).toBe(462);
  });

  it('leaves the list in place for a first comment without collisions', () => {
    expect(getCommentDraftPosition(selection, 470, [], 180)).toEqual({
      top: 470,
      cardOffsets: [],
    });
  });
});
