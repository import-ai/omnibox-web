/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import ResourcePage from '.';

const mockUseResource = jest.fn();

jest.mock('@/hooks/userResource', () => ({
  __esModule: true,
  default: () => mockUseResource(),
}));
jest.mock('./ResourceDetailView', () => ({
  __esModule: true,
  default: ({ resourceId }: { resourceId: string }) => (
    <div data-resource-id={resourceId} data-testid="resource-detail-view" />
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ResourcePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockUseResource.mockReturnValue({
      app: {},
      editPage: false,
      forbidden: false,
      loading: false,
      namespaceId: 'namespace-a',
      notFound: false,
      onResource: jest.fn(),
      resource: null,
      resourceId: 'resource-a',
    });
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  it('adapts route resource data to the shared resource detail view', async () => {
    await act(async () => root.render(<ResourcePage />));

    const view = container.querySelector(
      '[data-testid="resource-detail-view"]'
    );
    expect(view?.getAttribute('data-resource-id')).toBe('resource-a');
  });
});
