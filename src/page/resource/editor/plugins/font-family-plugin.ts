import { createPlatePlugin } from 'platejs/react';

import { FONT_FAMILIES } from '../config/fonts';

export const FontFamilyPlugin = createPlatePlugin({
  key: 'fontFamily',
  node: {
    isLeaf: true,
  },
});

// 导出工具函数:获取CSS字体值
export function getFontFamilyCss(value: string): string {
  const font = FONT_FAMILIES.find(f => f.value === value);
  return font?.cssValue || '';
}
