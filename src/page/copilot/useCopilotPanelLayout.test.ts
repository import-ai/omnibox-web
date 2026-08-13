import { getCopilotPanelLayout } from './useCopilotPanelLayout';

describe('getCopilotPanelLayout', () => {
  it.each([
    [375, 'fullscreen', 375],
    [767, 'fullscreen', 767],
    [768, 'overlay', 380],
    [1023, 'overlay', 380],
    [1024, 'split', 340],
    [1600, 'split', 380],
  ] as const)(
    'uses viewport %dpx for mode selection',
    (viewportWidth, mode, panelWidth) => {
      expect(getCopilotPanelLayout(viewportWidth)).toEqual({
        mode,
        panelWidth,
      });
    }
  );

  it('keeps desktop split when workspace width is narrow', () => {
    expect(getCopilotPanelLayout(1440, 900)).toEqual({
      mode: 'split',
      panelWidth: 340,
    });
  });

  it('normalizes invalid widths without producing a negative panel size', () => {
    expect(getCopilotPanelLayout(Number.NaN)).toEqual({
      mode: 'fullscreen',
      panelWidth: 0,
    });
    expect(getCopilotPanelLayout(-1)).toEqual({
      mode: 'fullscreen',
      panelWidth: 0,
    });
  });
});
