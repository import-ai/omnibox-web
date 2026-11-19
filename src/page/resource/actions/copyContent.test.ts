/** @jest-environment jsdom */

import copy from 'copy-to-clipboard';
import { toast } from 'sonner';

import * as bodyMarkdown from './copyBodyMarkdown';
import { copyContentToClipboard } from './copyContent';

jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
// Keep the production parser; only bypass Jest's CommonJS module loader.
jest.mock('mdast-util-from-markdown', () => {
  const { createRequire } = process.getBuiltinModule('node:module');
  return createRequire(__filename)('mdast-util-from-markdown');
});

const mockedCopy = jest.mocked(copy);
const mockedToast = jest.mocked(toast);
const t = (key: string) => key;

describe('copyContentToClipboard', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockedCopy.mockReset();
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
    expect(mockedToast.success).toHaveBeenCalledWith(
      'actions.copy_content_success',
      {
        position: 'bottom-right',
      }
    );
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
    expect(mockedToast.success).toHaveBeenCalledWith(
      'actions.copy_content_success',
      {
        position: 'bottom-right',
      }
    );
  });

  it('copies body text without editor color wrappers', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await copyContentToClipboard(
      '**微信 [text-color color="rgb(23, 23, 23)"]AI 对话[/text-color]助手**',
      t
    );

    expect(writeText).toHaveBeenCalledWith('**微信 AI 对话助手**');
  });

  it('uses the same clean body in the fallback and its plain-text payload', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    const setData = jest.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    mockedCopy.mockImplementation((_, options) => {
      options?.onCopy?.({ setData } as unknown as DataTransfer);
      return true;
    });

    await copyContentToClipboard(
      '[text-color color="rgb(0, 0, 0)"]body[/text-color]',
      t
    );

    expect(writeText).toHaveBeenCalledWith('body');
    expect(mockedCopy).toHaveBeenCalledWith(
      'body',
      expect.objectContaining({ format: 'text/plain' })
    );
    expect(setData).toHaveBeenCalledWith('text/plain', 'body');
    expect(setData).toHaveBeenCalledWith('text/html', '');
    expect(mockedToast.success).toHaveBeenCalledTimes(1);
  });

  it('reports failure when the fallback throws', async () => {
    mockedCopy.mockImplementation(() => {
      throw new Error('clipboard unavailable');
    });

    await expect(copyContentToClipboard('body', t)).resolves.toBeUndefined();

    expect(mockedToast.success).not.toHaveBeenCalled();
    expect(mockedToast.error).toHaveBeenCalledWith('copy.fail', {
      position: 'bottom-right',
    });
  });

  it('does not copy raw content when cleanup fails', async () => {
    const writeText = jest.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    jest.spyOn(bodyMarkdown, 'copyBodyMarkdown').mockImplementationOnce(() => {
      throw new Error('parse failed');
    });

    await copyContentToClipboard('[text-color]body[/text-color]', t);

    expect(writeText).not.toHaveBeenCalled();
    expect(mockedCopy).not.toHaveBeenCalled();
    expect(mockedToast.error).toHaveBeenCalledWith('copy.fail', {
      position: 'bottom-right',
    });
  });

  it('treats empty styled content as no body to copy', async () => {
    await copyContentToClipboard('[text-color color="red"][/text-color]', t);

    expect(mockedCopy).not.toHaveBeenCalled();
    expect(mockedToast.error).toHaveBeenCalledWith(
      'actions.no_content_to_copy',
      { position: 'bottom-right' }
    );
  });

  it('shows a copy-specific message when content is empty', async () => {
    await copyContentToClipboard(null, t);

    expect(mockedCopy).not.toHaveBeenCalled();
    expect(mockedToast.error).toHaveBeenCalledWith(
      'actions.no_content_to_copy',
      {
        position: 'bottom-right',
      }
    );
  });

  it('shows failure when neither clipboard method succeeds', async () => {
    mockedCopy.mockReturnValue(false);

    await copyContentToClipboard('# RSS article', t);

    expect(mockedToast.error).toHaveBeenCalledWith('copy.fail', {
      position: 'bottom-right',
    });
  });
});
