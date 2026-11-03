import Hook from './hook.class';

jest.mock('lodash-es', () => ({
  isFunction: (value: unknown) => typeof value === 'function',
  isString: (value: unknown) => typeof value === 'string',
  isUndefined: (value: unknown) => value === undefined,
}));

describe('Hook event delivery', () => {
  it('drops an unhandled immediate event instead of replaying it later', () => {
    const hook = new Hook();
    const listener = jest.fn();

    hook.fireNow('scroll-to-bottom', { resourceId: 'folder-1' });
    hook.on('scroll-to-bottom', listener);

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps caching regular events for listeners registered later', () => {
    const hook = new Hook();
    const listener = jest.fn();

    hook.fire('resource-updated', { id: 'resource-1' });
    hook.on('resource-updated', listener);

    expect(listener).toHaveBeenCalledWith({ id: 'resource-1' });
  });
});
