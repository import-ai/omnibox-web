import { getCopilotPanelLayout } from './useCopilotPanelLayout';

describe('getCopilotPanelLayout', () => {
  it.each([
    [375, 'fullscreen', 375],
    [767, 'fullscreen', 767],
    [768, 'overlay', 380],
    [1099, 'overlay', 380],
    [1100, 'split', 352],
    [1600, 'split', 380],
  ] as const)(
    'uses the adaptive layout for a %dpx workspace',
    (availableWidth, mode, panelWidth) => {
      expect(getCopilotPanelLayout(availableWidth)).toEqual({
        mode,
        panelWidth,
      });
    }
  );

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
