import {
  getImageViewerLayout,
  rotateImagePoint,
  stepImageViewerZoom,
} from './imageViewerGeometry';

const viewport = { width: 900, height: 650 };
const original = { width: 1428, height: 14180 };

it('fits the long edge from the top and keeps rotated overflow in the positive scroll plane', () => {
  const fit = getImageViewerLayout(original, viewport, 0, null);
  expect(fit).toMatchObject({ width: 810, y: 0 });
  expect(fit.heightWithGutter).toBeGreaterThan(viewport.height);
  const rotated = getImageViewerLayout(original, viewport, 1, 1);
  expect(rotated).toMatchObject({
    width: 14180,
    height: 1428,
    x: 0,
    y: 0,
    widthWithGutter: 14180,
    heightWithGutter: 1428,
  });
  const point = { x: 0.25, y: 0.75 };
  expect(rotateImagePoint(point, 1)).toEqual({ x: 0.25, y: 0.25 });
  expect(rotateImagePoint(rotateImagePoint(point, 1), -1)).toEqual(point);
});

it('steps to the next fixed zoom level in either direction from a fitted ratio', () => {
  expect(stepImageViewerZoom(0.544, 0.544, 1)).toBe(0.75);
  expect(stepImageViewerZoom(0.544, 0.544, -1)).toBe(0.5);
  expect(stepImageViewerZoom(0.75, 0.544, -1)).toBe(0.5);
  expect(stepImageViewerZoom(0.75 + Number.EPSILON, 0.544, 1)).toBe(1);
});

it('disables zoom at its limits without rounding up a very small initial fit', () => {
  expect(stepImageViewerZoom(0.1, 0.544, -1)).toBeNull();
  expect(stepImageViewerZoom(4, 0.544, 1)).toBeNull();
  expect(stepImageViewerZoom(0.043, 0.043, -1)).toBeNull();
  expect(stepImageViewerZoom(0.043, 0.043, 1)).toBe(0.1);
  expect(stepImageViewerZoom(0.1, 0.043, -1)).toBe(0.043);
});

it('uses the original fitted bounds for ordinary images when the toolbar has space', () => {
  const viewport = { width: 1600, height: 844, dialogHeight: 900 };
  expect(
    getImageViewerLayout({ width: 1440, height: 720 }, viewport, 0, null)
  ).toMatchObject({ width: 960, height: 480, x: 320, y: 210 });
  expect(
    getImageViewerLayout({ width: 600, height: 1200 }, viewport, 0, null).height
  ).toBe(765);
});
