/** @jest-environment jsdom */
import { trackButtonClick } from '@/lib/trackButtonClick';

import { DialogContent } from './Dialog';

jest.mock('@/lib/request', () => ({ http: {} }));
jest.mock('@/lib/trackButtonClick', () => ({
  trackButtonClick: jest.fn(),
}));

it('keeps captcha interactions inside the dialog and forwards other outside events', () => {
  const captcha = document.createElement('div');
  captcha.id = 'aliyunCaptcha-window';
  const outside = document.createElement('div');
  const onOutside = jest.fn();
  const content = DialogContent({
    onPointerDownOutside: onOutside,
    onFocusOutside: onOutside,
  });
  for (const handler of [
    content.props.onPointerDownOutside,
    content.props.onFocusOutside,
  ]) {
    const preventDefault = jest.fn();
    handler({ target: captcha, preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onOutside).not.toHaveBeenCalled();
    const event = { target: outside, preventDefault };
    handler(event);
    expect(onOutside).toHaveBeenCalledWith(event);
    onOutside.mockClear();
  }
});

it('records a blank-area close after the dialog accepts the outside click', async () => {
  const content = DialogContent({
    outsideCloseTrackName: 'chat_overlay_close',
    outsideCloseTarget: 'thinking',
  });
  const prevented = {
    target: document.body,
    defaultPrevented: true,
    preventDefault: jest.fn(),
  };
  content.props.onPointerDownOutside(prevented);
  expect(trackButtonClick).not.toHaveBeenCalled();

  const event = {
    target: document.body,
    defaultPrevented: false,
    preventDefault: jest.fn(),
  };
  content.props.onPointerDownOutside(event);
  await Promise.resolve();
  expect(trackButtonClick).toHaveBeenCalledWith('chat_overlay_close', {
    dismiss: 'outside',
    target: 'thinking',
  });
});
