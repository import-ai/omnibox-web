import i18next from 'i18next';
import { Edit2, Trash2 } from 'lucide-react';

export function getActions(): Array<Array<{ label: string; icon: any }>> {
  return [
    [
      {
        label: i18next.t('rename'),
        icon: Edit2,
      },
      {
        label: i18next.t('delete'),
        icon: Trash2,
      },
    ],
  ];
}
