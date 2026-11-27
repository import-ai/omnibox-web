jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

type NamespaceInfoModule = typeof import('./useNamespaceInfo');

function loadModule(): {
  module: NamespaceInfoModule;
  mockGet: jest.Mock;
} {
  const module = require('./useNamespaceInfo') as NamespaceInfoModule;
  const { http } = require('@/lib/request') as {
    http: { get: jest.Mock };
  };
  return { module, mockGet: http.get };
}

describe('fetchNamespaceInfo', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('merges the plan tier reported by pro namespaces', async () => {
    const { module, mockGet } = loadModule();
    mockGet.mockImplementation((path: string) => {
      if (path === 'pro-namespaces') {
        return Promise.resolve([
          { id: 'namespace-a', name: 'A', tier: 'premium' },
        ]);
      }
      return Promise.resolve({ id: 'namespace-a', name: 'A' });
    });

    await expect(
      module.fetchNamespaceInfo('namespace-a')
    ).resolves.toMatchObject({
      id: 'namespace-a',
      tier: 'premium',
    });
  });

  it('keeps the namespace record when pro namespaces do not list it', async () => {
    const { module, mockGet } = loadModule();
    mockGet.mockImplementation((path: string) => {
      if (path === 'pro-namespaces') return Promise.resolve([]);
      return Promise.resolve({ id: 'namespace-b', name: 'B' });
    });

    await expect(
      module.fetchNamespaceInfo('namespace-b')
    ).resolves.toMatchObject({
      id: 'namespace-b',
    });
    await expect(
      module.fetchNamespaceInfo('namespace-b')
    ).resolves.not.toHaveProperty('tier');
  });

  it('does not ask pro for a tier the namespace record already reports', async () => {
    const { module, mockGet } = loadModule();
    mockGet.mockResolvedValue({
      id: 'namespace-c',
      name: 'C',
      tier: 'basic',
    });

    await expect(
      module.fetchNamespaceInfo('namespace-c')
    ).resolves.toMatchObject({
      id: 'namespace-c',
      tier: 'basic',
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('namespaces/namespace-c');
  });
});
