import type { SidebarActions, SidebarGet, SidebarSet } from '../types';
import { buildBaseActions } from './base';
import { buildNavigationActions } from './navigation';

export function buildActions(set: SidebarSet, get: SidebarGet): SidebarActions {
  return {
    ...buildBaseActions(set),
    ...buildNavigationActions(set, get),
  };
}
