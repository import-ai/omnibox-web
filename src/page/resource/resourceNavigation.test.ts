import type { NavigateFunction } from 'react-router-dom';

import { navigateToResource } from './resourceNavigation';

describe('navigateToResource', () => {
  it('synchronously commits the resource route while preserving navigation state', () => {
    const navigate = jest.fn() as jest.MockedFunction<NavigateFunction>;

    navigateToResource(navigate, '/namespace-a/resource-b', {
      state: { fromSidebar: true },
    });

    expect(navigate).toHaveBeenCalledWith('/namespace-a/resource-b', {
      flushSync: true,
      state: { fromSidebar: true },
    });
  });
});
