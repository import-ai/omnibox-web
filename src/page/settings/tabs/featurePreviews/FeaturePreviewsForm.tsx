import { PenLine } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
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

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('setting.feature_previews')}
        </h3>
      </div>

      <div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
        <PenLine className="size-4 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-5 text-foreground">
            {t('feature_previews.editor_v2.title')}
          </span>
          <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
            {t('feature_previews.editor_v2.description')}
          </span>
        </span>
        <Switch
          checked={editorV2Enabled}
          onCheckedChange={handleEditorV2Toggle}
          disabled={savingFeature === FeaturePreviewFeature.EDITOR_V2}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
