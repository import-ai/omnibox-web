/** @jest-environment jsdom */

import { toast } from 'sonner';

import { openFilePicker } from './openFilePicker';

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('sonner', () => ({
  toast: { warning: jest.fn() },
}));

const mockedWarning = jest.mocked(toast.warning);

describe('openFilePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows guidance when the picker does not open', () => {
    const input = document.createElement('input');
    input.type = 'file';
    const click = jest.spyOn(input, 'click').mockImplementation(() => {});

    openFilePicker(input);
    jest.advanceTimersByTime(1000);

    expect(click).toHaveBeenCalledTimes(1);
    expect(mockedWarning).toHaveBeenCalledWith(
      'upload.file_picker_unavailable',
      { description: 'upload.file_picker_recovery' }
    );
  });

  it('does not show guidance when the window loses focus', () => {
    const input = document.createElement('input');
    input.type = 'file';
    jest.spyOn(input, 'click').mockImplementation(() => {});

    openFilePicker(input);
    window.dispatchEvent(new Event('blur'));
    jest.advanceTimersByTime(1000);

    expect(mockedWarning).not.toHaveBeenCalled();
  });

  it.each(['change', 'cancel'])('recognizes the input %s event', eventName => {
    const input = document.createElement('input');
    input.type = 'file';
    jest.spyOn(input, 'click').mockImplementation(() => {});

    openFilePicker(input);
    input.dispatchEvent(new Event(eventName));
    jest.advanceTimersByTime(1000);

    expect(mockedWarning).not.toHaveBeenCalled();
  });

  it('shows guidance when opening the picker throws', () => {
    const input = document.createElement('input');
    input.type = 'file';
    jest.spyOn(input, 'click').mockImplementation(() => {
      throw new DOMException('Not allowed', 'NotAllowedError');
    });

    openFilePicker(input);

    expect(mockedWarning).toHaveBeenCalledWith(
      'upload.file_picker_unavailable',
      { description: 'upload.file_picker_recovery' }
    );
  });
});
