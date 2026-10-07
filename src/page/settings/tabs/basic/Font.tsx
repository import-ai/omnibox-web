import { Type } from 'lucide-react';
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
import { fonts, resolveFont } from '@/lib/fonts';
import { http } from '@/lib/request';

export default function Font() {
  const { t } = useTranslation();
  const { app, theme, onToggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const selected = resolveFont(theme.font);

  const selectFont = async (value: string) => {
    const font = resolveFont(value);
    if (saving || font === selected) return;
    setSaving(true);
    onToggleTheme(theme.skin, undefined, font);
    try {
      await http.post('/user/option', { name: 'font', value: font });
    } catch {
      onToggleTheme(app.getTheme().skin, undefined, selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
      <Type className="size-4 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-5 text-foreground">
          {t('manage.font')}
        </span>
        <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
          {t('manage.font_description')}
        </span>
      </span>
      <Select
        value={selected}
        onValueChange={value => void selectFont(value)}
        disabled={saving}
      >
        <SelectTrigger className="w-[120px] px-2 lg:w-[180px] lg:px-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="w-[120px] lg:w-[180px]">
          {fonts.map(font => (
            <SelectItem
              key={font.name}
              value={font.name}
              style={{ fontFamily: font.family }}
            >
              {font.name === 'system' ? t('manage.font_system') : font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
