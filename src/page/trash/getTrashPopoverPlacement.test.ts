import {
  getTrashPopoverPlacement,
  TRASH_POPOVER_GAP_PX,
  TRASH_POPOVER_WIDTH_PX,
} from './getTrashPopoverPlacement';

describe('getTrashPopoverPlacement', () => {
  it('keeps the popover on the right when there is enough space', () => {
    expect(
      getTrashPopoverPlacement({
        triggerLeft: 16,
        triggerRight: 200,
        viewportWidth: 1280,
      })
    ).toEqual({ align: 'start', side: 'right' });
  });

  it('flips to the left when the right side is too narrow', () => {
    expect(
      getTrashPopoverPlacement({
        triggerLeft: 700,
        triggerRight: 1080,
        viewportWidth: 1100,
      })
    ).toEqual({ align: 'start', side: 'left' });
  });

  it('drops below the trigger when neither side can fit the menu', () => {
    const triggerRight = 200;
    const viewportWidth =
      triggerRight + TRASH_POPOVER_GAP_PX + TRASH_POPOVER_WIDTH_PX - 1;

    expect(
      getTrashPopoverPlacement({
        triggerLeft: 16,
        triggerRight,
        viewportWidth,
      })
    ).toEqual({ align: 'start', side: 'bottom' });
  });
});
