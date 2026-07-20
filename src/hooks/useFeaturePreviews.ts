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

export default function useFeaturePreviews(namespaceId: string) {
  const [featurePreviews, setFeaturePreviews] = useState<FeaturePreview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeaturePreviews = useCallback(async () => {
    if (!namespaceId) {
      setFeaturePreviews([]);
      useResourceStore.getState().resetFeaturePreviews();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response: FeaturePreviewsResponse = await http.get(
        `/namespaces/${namespaceId}/feature-previews`
      );
      useResourceStore.getState().setFeaturePreviews(response.features);
      setFeaturePreviews(
        Object.entries(response.features).map(([feature, enabled]) => ({
          feature: feature as FeaturePreviewFeature,
          enabled,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [namespaceId]);

  const updateFeaturePreview = async (
    feature: FeaturePreviewFeature,
    enabled: boolean
  ): Promise<FeaturePreview> => {
    const response: FeaturePreview = await http.put(
      `/namespaces/${namespaceId}/feature-previews`,
      {
        feature,
        enabled,
      }
    );
    useResourceStore.getState().setFeaturePreview(feature, response.enabled);
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
    fetchFeaturePreviews();
  }, [fetchFeaturePreviews]);

  return {
    featurePreviews,
    loading,
    refetch: fetchFeaturePreviews,
    updateFeaturePreview,
  };
}
