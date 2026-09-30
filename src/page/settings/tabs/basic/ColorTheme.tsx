import { Check, ChevronDown, Palette } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
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
      <span className="min-w-0 text-sm font-medium leading-5 text-foreground">
        {t('manage.color_theme')}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={saving}
            className="h-8 w-[120px] justify-between rounded-md border-border bg-transparent px-2 font-normal shadow-none lg:w-[180px] lg:px-3"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full ring-1 ring-foreground/20"
                style={{ backgroundColor: selected.swatch }}
              />
              <span className="truncate">{t(selected.labelKey)}</span>
            </span>
            <ChevronDown className="size-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 w-[120px] lg:w-[180px]">
          {colorThemes.map(item => (
            <DropdownMenuItem
              key={item.name}
              className="flex gap-2 focus:bg-accent"
              onSelect={() => void selectTheme(item.name)}
            >
              <span
                className="size-3 shrink-0 rounded-full ring-1 ring-foreground/20"
                style={{ backgroundColor: item.swatch }}
              />
              <span className="flex-1">{t(item.labelKey)}</span>
              {item.name === selected.name && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
