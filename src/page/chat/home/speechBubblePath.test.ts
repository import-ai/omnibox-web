import { speechBubblePath } from './speechBubblePath';

it('keeps the Figma tail fixed while the straight edges follow the bubble size', () => {
  const design = speechBubblePath(161.62, 48.0555);
  const wider = speechBubblePath(320, 48.0555);
  const taller = speechBubblePath(161.62, 80);

  expect(design).toContain('C1.314 47.524 -0.364 44.634 0.967 42.317');
  expect(wider).toContain('C1.314 47.524 -0.364 44.634 0.967 42.317');
  expect(taller).toContain('C1.314 79.469 -0.364 76.578 0.967 74.261');
  expect(design).toContain('C4.711 12.624 16.593 0.494 31.355 0.5');
  expect(taller).toContain('C4.711 12.624 16.593 0.494 31.355 0.5');
  expect(design).not.toBe(wider);
});
