import { PenLine } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Switch } from '@/components/ui/Switch';
import useFeaturePreviews, {
  FeaturePreviewFeature,
} from '@/hooks/useFeaturePreviews';

export function FeaturePreviewsForm() {
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const { featurePreviews, loading, updateFeaturePreview } =
    useFeaturePreviews(namespaceId);
  const [savingFeature, setSavingFeature] =
    useState<FeaturePreviewFeature | null>(null);

  const editorV2Preview = featurePreviews.find(
    preview => preview.feature === FeaturePreviewFeature.EDITOR_V2
  );
  const editorV2Enabled = editorV2Preview?.enabled ?? false;

  const handleEditorV2Toggle = async (checked: boolean) => {
    setSavingFeature(FeaturePreviewFeature.EDITOR_V2);
    try {
      await updateFeaturePreview(FeaturePreviewFeature.EDITOR_V2, checked);
    } finally {
      setSavingFeature(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('setting.feature_previews')}
        </h3>
      </div>

      <div className="flex w-full items-center justify-between gap-3 pt-6">
        <div className="flex min-w-0 items-start gap-2">
          <PenLine className="mt-0.5 size-4 shrink-0 text-muted-foreground lg:size-5" />
          <div className="flex min-w-0 flex-col gap-1 lg:gap-2">
            <span className="text-sm font-semibold text-foreground lg:text-base">
              {t('feature_previews.editor_v2.title')}
            </span>
            <span className="text-xs text-muted-foreground lg:text-sm">
              {t('feature_previews.editor_v2.description')}
            </span>
          </div>
        </div>
        <Switch
          checked={editorV2Enabled}
          onCheckedChange={handleEditorV2Toggle}
          disabled={
            loading || savingFeature === FeaturePreviewFeature.EDITOR_V2
          }
          className="shrink-0"
        />
      </div>
    </div>
  );
}
