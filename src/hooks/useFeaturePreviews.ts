import { useEffect, useState } from 'react';

import { http } from '@/lib/request';

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

  const fetchFeaturePreviews = async () => {
    if (!namespaceId) return;

    try {
      setLoading(true);
      const response: FeaturePreviewsResponse = await http.get(
        `/namespaces/${namespaceId}/feature-previews`
      );
      setFeaturePreviews(
        Object.entries(response.features).map(([feature, enabled]) => ({
          feature: feature as FeaturePreviewFeature,
          enabled,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFeaturePreview = async (
    feature: FeaturePreviewFeature,
    enabled: boolean
  ): Promise<FeaturePreview> => {
    const response = await http.put(
      `/namespaces/${namespaceId}/feature-previews`,
      {
        feature,
        enabled,
      }
    );
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
  }, [namespaceId]);

  return {
    featurePreviews,
    loading,
    refetch: fetchFeaturePreviews,
    updateFeaturePreview,
  };
}
