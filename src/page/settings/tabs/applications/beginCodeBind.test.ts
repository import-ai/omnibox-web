import type { Application } from '@/interface';

import { beginCodeBind } from './beginCodeBind';

function application(partial: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    namespace_id: 'ns',
    user_id: 'user',
    app_id: 'wechat_bot',
    ...partial,
  };
}

describe('beginCodeBind', () => {
  it('reports an application that already has an api key', async () => {
    const bindApplication = jest.fn();

    await expect(
      beginCodeBind(
        application({ api_key_id: 'key-1', attrs: { key: '111111' } }),
        bindApplication
      )
    ).resolves.toEqual({ status: 'already_bound' });
    expect(bindApplication).not.toHaveBeenCalled();
  });

  it('reuses an in-progress bind code', async () => {
    const current = application({
      attrs: { key: '250096', url_link: 'https://example.test/bind' },
    });
    const bindApplication = jest.fn();

    await expect(beginCodeBind(current, bindApplication)).resolves.toEqual({
      status: 'ready',
      code: '250096',
      application: current,
      resumed: true,
    });
    expect(bindApplication).not.toHaveBeenCalled();
  });

  it('starts a bind when no code exists', async () => {
    const started = application({
      id: 'app-2',
      attrs: { key: '962675', url_link: 'https://example.test/new' },
    });
    const bindApplication = jest.fn().mockResolvedValue(started);

    await expect(
      beginCodeBind(application(), bindApplication)
    ).resolves.toEqual({
      status: 'ready',
      code: '962675',
      application: started,
      resumed: false,
    });
    expect(bindApplication).toHaveBeenCalledWith('wechat_bot');
  });
});
