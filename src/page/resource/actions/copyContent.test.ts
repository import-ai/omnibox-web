/** @jest-environment jsdom */

import copy from 'copy-to-clipboard';
import { toast } from 'sonner';

import { copyContentToClipboard } from './copyContent';

jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: jest.fn() }));

const mockedCopy = jest.mocked(copy);
const mockedToast = jest.mocked(toast);
const t = (key: string) => key;

describe('copyContentToClipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  it('writes content with the Clipboard API and shows success', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await copyContentToClipboard('# RSS article', t);

    expect(writeText).toHaveBeenCalledWith('# RSS article');
    expect(mockedCopy).not.toHaveBeenCalled();
    expect(mockedToast).toHaveBeenCalledWith('actions.copy_content_success', {
      position: 'bottom-right',
    });
  });

  it('falls back when the Clipboard API rejects', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    mockedCopy.mockReturnValue(true);

    await copyContentToClipboard('# RSS article', t);

    expect(mockedCopy).toHaveBeenCalledWith(
      '# RSS article',
      expect.objectContaining({ format: 'text/plain' })
    );
    expect(mockedToast).toHaveBeenCalledWith('actions.copy_content_success', {
      position: 'bottom-right',
    });
  });

  it('shows a copy-specific message when content is empty', async () => {
    await copyContentToClipboard(null, t);

    expect(mockedCopy).not.toHaveBeenCalled();
    expect(mockedToast).toHaveBeenCalledWith('actions.no_content_to_copy', {
      position: 'bottom-right',
    });
  });

  it('shows failure when neither clipboard method succeeds', async () => {
    mockedCopy.mockReturnValue(false);

    await copyContentToClipboard('# RSS article', t);

    expect(mockedToast).toHaveBeenCalledWith('copy.fail', {
      position: 'bottom-right',
    });
  });
});
