/** @jest-environment jsdom */
import { DialogContent } from './Dialog';

jest.mock('@/lib/request', () => ({ http: {} }));

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
