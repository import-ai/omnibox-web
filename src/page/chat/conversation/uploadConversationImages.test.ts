import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import {
  resolveConversationImages,
  uploadConversationImage,
  withUploadedImageParts,
} from './uploadConversationImages';

const localValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return localValues.size;
  },
  clear: () => localValues.clear(),
  getItem: key => localValues.get(key) ?? null,
  key: index => Array.from(localValues.keys())[index] ?? null,
  removeItem: key => localValues.delete(key),
  setItem: (key, value) => localValues.set(key, value),
};
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
});

describe('uploadConversationImages', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    jest.mocked(toast.error).mockClear();
    localValues.clear();
    localStorage.setItem('token', 'test-token');
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
  });

  it('uploads a file only when asked and maps the attachment payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        attachment_id: 'att-1',
        name: 'shot.png',
        preview_url: '/preview/shot.png',
      }),
    });
    const file = new File(['png'], 'shot.png', { type: 'image/png' });

    await expect(
      uploadConversationImage('ns-1', 'conv-1', file)
    ).resolves.toEqual({
      attachment_id: 'att-1',
      name: 'shot.png',
      url: '/preview/shot.png',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      '/api/v1/namespaces/ns-1/conversations/conv-1/attachments'
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: 'Bearer test-token',
      'X-Client-Platform': 'web',
    });
    expect(init.body.get('file[]')).toBe(file);
  });

  it('uploads composer files and passes through already uploaded images', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        attachment_id: 'att-2',
        name: 'local.png',
        preview_url: '/preview/local.png',
      }),
    });
    const file = new File(['png'], 'local.png', { type: 'image/png' });

    await expect(
      resolveConversationImages('ns-1', 'conv-1', [
        {
          attachment_id: 'att-1',
          name: 'ready.png',
          url: '/preview/ready.png',
        },
        {
          id: 'local-1',
          name: 'local.png',
          url: 'blob:local',
          file,
        },
      ])
    ).resolves.toEqual([
      {
        attachment_id: 'att-1',
        name: 'ready.png',
        url: '/preview/ready.png',
      },
      {
        attachment_id: 'att-2',
        name: 'local.png',
        url: '/preview/local.png',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'reports failed uploads once (network error: %s)',
    async networkError => {
      if (networkError)
        fetchMock.mockRejectedValue(new TypeError('Network failure'));
      else fetchMock.mockResolvedValue({ ok: false });
      await expect(
        uploadConversationImage('ns', 'conv', new File(['png'], 'shot.png'))
      ).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith('chat.image.upload_failed');
    }
  );

  it('replaces pending image display parts with uploaded attachments', () => {
    expect(
      withUploadedImageParts(
        [
          { type: 'text', text: '看看这张图' },
          {
            type: 'image',
            attachment_id: 'stale',
            name: 'old.png',
            preview_url: 'blob:old',
          },
        ],
        [
          {
            attachment_id: 'att-1',
            name: 'shot.png',
            url: '/preview/shot.png',
          },
        ]
      )
    ).toEqual([
      { type: 'text', text: '看看这张图' },
      {
        type: 'image',
        attachment_id: 'att-1',
        name: 'shot.png',
        preview_url: '/preview/shot.png',
      },
    ]);
  });
});
