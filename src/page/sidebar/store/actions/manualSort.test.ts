jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  moveResource: jest.fn(),
  updateManualSort: jest.fn(),
}));

import { buildManualOrder } from './manualSort';

it('moves a resource before or after a sibling without duplicating it', () => {
  const children = ['a', 'b', 'c', 'd'];

  expect(buildManualOrder(children, 'd', 'b', 'before')).toEqual([
    'a',
    'd',
    'b',
    'c',
  ]);
  expect(buildManualOrder(children, 'a', 'c', 'after')).toEqual([
    'b',
    'c',
    'a',
    'd',
  ]);
});
