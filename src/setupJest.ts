jest.mock('@/lib/trackButtonClick', () => ({
  trackButtonClick: jest.fn(),
  onOverlayClose: () => jest.fn(),
  overlayCloseName: () => 'overlay_close',
}));
