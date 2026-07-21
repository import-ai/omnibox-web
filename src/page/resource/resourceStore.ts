import { create } from 'zustand';

export interface ResourceState {
  featurePreviews: Record<string, boolean>;
}

export interface ResourceActions {
  setFeaturePreviews: (features: Record<string, boolean>) => void;
  setFeaturePreview: (feature: string, enabled: boolean) => void;
}

export type ResourceStore = ResourceState & ResourceActions;

export const initialState: ResourceState = {
  featurePreviews: {},
};

export const useResourceStore = create<ResourceStore>()(set => ({
  ...initialState,
  setFeaturePreviews: featurePreviews => set({ featurePreviews }),
  setFeaturePreview: (feature, enabled) =>
    set(state => ({
      featurePreviews: {
        ...state.featurePreviews,
        [feature]: enabled,
      },
    })),
}));

export function selectUseOmniboxEditor(state: ResourceState): boolean {
  return state.featurePreviews.editor_v2;
}
