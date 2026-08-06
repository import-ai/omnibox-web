import { create } from 'zustand';

export interface ResourceState {
  featurePreviewsUserId: string | null;
  featurePreviews: Record<string, boolean>;
}

export interface ResourceActions {
  setFeaturePreviews: (
    userId: string,
    features: Record<string, boolean>
  ) => void;
  setFeaturePreview: (
    userId: string,
    feature: string,
    enabled: boolean
  ) => void;
  resetFeaturePreviews: () => void;
}

export type ResourceStore = ResourceState & ResourceActions;

export const initialState: ResourceState = {
  featurePreviewsUserId: null,
  featurePreviews: {},
};

export const useResourceStore = create<ResourceStore>()(set => ({
  ...initialState,
  setFeaturePreviews: (featurePreviewsUserId, featurePreviews) =>
    set({ featurePreviewsUserId, featurePreviews }),
  setFeaturePreview: (featurePreviewsUserId, feature, enabled) =>
    set(state => ({
      featurePreviewsUserId,
      featurePreviews: {
        ...state.featurePreviews,
        [feature]: enabled,
      },
    })),
  resetFeaturePreviews: () => set(initialState),
}));

export function selectUseOmniboxEditor(state: ResourceState): boolean {
  return (
    state.featurePreviewsUserId === localStorage.getItem('uid') &&
    state.featurePreviews.editor_v2
  );
}
