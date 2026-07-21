import { PenLine } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@/components/ui/Switch';
import useFeaturePreviews, {
  FeaturePreviewFeature,
} from '@/hooks/useFeaturePreviews';

export function FeaturePreviewsForm() {
  const { t } = useTranslation();
  const { featurePreviews, loading, updateFeaturePreview } =
    useFeaturePreviews();
  const [saving, setSaving] = useState(false);
  const enabled =
    featurePreviews.find(
      preview => preview.feature === FeaturePreviewFeature.EDITOR_V2
    )?.enabled ?? false;

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      await updateFeaturePreview(FeaturePreviewFeature.EDITOR_V2, checked);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col pt-4">
      <h3 className="text-base font-semibold text-foreground">
        {t('setting.feature_previews')}
      </h3>
      <div className="mt-6 grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
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
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading || saving}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
