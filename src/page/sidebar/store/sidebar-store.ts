import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { buildActions } from './actions';
import { initialState } from './state';
import { SidebarStore } from './types';

export const useSidebarStore = create<SidebarStore>()(
  immer((set, get) => ({
    ...initialState,
    ...buildActions(set, get),
  }))
);
