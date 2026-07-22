import { useCallback, useEffect, useState } from 'react';

import { http } from '@/lib/request';
import { useResourceStore } from '@/page/resource/resourceStore';

export enum FeaturePreviewFeature {
  EDITOR_V2 = 'editor_v2',
}

export interface FeaturePreview {
  feature: FeaturePreviewFeature;
  enabled: boolean;
}

interface FeaturePreviewsResponse {
  features: Record<FeaturePreviewFeature, boolean>;
}

function toFeaturePreviews(
  features: Record<string, boolean>
): FeaturePreview[] {
  return Object.entries(features).map(([feature, enabled]) => ({
    feature: feature as FeaturePreviewFeature,
    enabled,
  }));
}

export default function useFeaturePreviews() {
  const [userId, setUserId] = useState(localStorage.getItem('uid'));
  const [featurePreviews, setFeaturePreviews] = useState<FeaturePreview[]>(
    () => {
      const state = useResourceStore.getState();
      return state.featurePreviewsUserId === userId
        ? toFeaturePreviews(state.featurePreviews)
        : [];
    }
  );
  const [loading, setLoading] = useState(true);

  const fetchFeaturePreviews = useCallback(async () => {
    const requestUserId = userId;
    if (!requestUserId) {
      setFeaturePreviews([]);
      useResourceStore.getState().resetFeaturePreviews();
      setLoading(false);
      return;
    }
    if (useResourceStore.getState().featurePreviewsUserId !== requestUserId) {
      useResourceStore.getState().resetFeaturePreviews();
      setFeaturePreviews([]);
    }

    try {
      setLoading(true);
      const response: FeaturePreviewsResponse =
        await http.get('/feature-previews');
      if (localStorage.getItem('uid') !== requestUserId) {
        return;
      }
      useResourceStore
        .getState()
        .setFeaturePreviews(requestUserId, response.features);
      setFeaturePreviews(toFeaturePreviews(response.features));
    } catch (error) {
      if (
        localStorage.getItem('uid') === requestUserId &&
        useResourceStore.getState().featurePreviewsUserId !== requestUserId
      ) {
        setFeaturePreviews([]);
        useResourceStore.getState().resetFeaturePreviews();
      }
      throw error;
    } finally {
      if (localStorage.getItem('uid') === requestUserId) {
        setLoading(false);
      }
    }
  }, [userId]);

  const updateFeaturePreview = async (
    feature: FeaturePreviewFeature,
    enabled: boolean
  ): Promise<FeaturePreview> => {
    const requestUserId = userId;
    if (!requestUserId) {
      throw new Error('Cannot update feature previews without a user');
    }
    const response: FeaturePreview = await http.put('/feature-previews', {
      feature,
      enabled,
    });
    if (localStorage.getItem('uid') !== requestUserId) {
      return response;
    }
    useResourceStore
      .getState()
      .setFeaturePreview(requestUserId, feature, response.enabled);
    setFeaturePreviews(previews => {
      const exists = previews.some(preview => preview.feature === feature);
      if (!exists) {
        return [...previews, response];
      }
      return previews.map(preview =>
        preview.feature === feature ? response : preview
      );
    });
    return response;
  };

  useEffect(() => {
    void fetchFeaturePreviews().catch(() => undefined);
  }, [fetchFeaturePreviews]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'uid') {
        setUserId(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    featurePreviews,
    loading,
    refetch: fetchFeaturePreviews,
    updateFeaturePreview,
  };
}
