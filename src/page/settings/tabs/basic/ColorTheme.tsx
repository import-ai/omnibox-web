import { Palette } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/omnibox/Select';
import useTheme from '@/hooks/useTheme';
import { type ColorThemeName, colorThemes } from '@/lib/colorThemes';
import { http } from '@/lib/request';

export default function ColorTheme() {
  const { t } = useTranslation();
  const { app, theme, onToggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const selected =
    colorThemes.find(item => item.name === theme.colorTheme) ?? colorThemes[0];

  const selectTheme = async (name: ColorThemeName) => {
    if (saving || name === selected.name) return;
    const previous = selected.name;
    setSaving(true);
    onToggleTheme(theme.skin, name);
    try {
      await http.post('/user/option', { name: 'color_theme', value: name });
    } catch {
      onToggleTheme(app.getTheme().skin, previous);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
      <Palette className="size-4 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-5 text-foreground">
          {t('manage.color_theme')}
        </span>
        <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
          {t('manage.color_theme_description')}
        </span>
      </span>
      <Select
        value={selected.name}
        onValueChange={value => void selectTheme(value as ColorThemeName)}
        disabled={saving}
      >
        <SelectTrigger className="w-[120px] px-2 lg:w-[180px] lg:px-3">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full ring-1 ring-foreground/20"
              style={{ backgroundColor: selected.swatch }}
            />
            <SelectValue>{t(selected.labelKey)}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="max-h-72 w-[120px] lg:w-[180px]"
        >
          {colorThemes.map(item => (
            <SelectItem key={item.name} value={item.name} className="gap-2">
              <span
                className="size-3 shrink-0 rounded-full ring-1 ring-foreground/20"
                style={{ backgroundColor: item.swatch }}
              />
              <span>{t(item.labelKey)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
