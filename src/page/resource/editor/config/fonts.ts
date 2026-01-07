export interface FontFamily {
  label: string;
  value: string;
  cssValue: string;
}

export const FONT_FAMILIES: FontFamily[] = [
  {
    label: '默认',
    value: '',
    cssValue: '',
  },
  {
    label: '宋体',
    value: 'SimSun',
    cssValue: '宋体, SimSun, serif',
  },
  {
    label: '黑体',
    value: 'SimHei',
    cssValue: '黑体, SimHei, sans-serif',
  },
  {
    label: '楷体',
    value: 'KaiTi',
    cssValue: '楷体, KaiTi, serif',
  },
  {
    label: '微软雅黑',
    value: 'Microsoft YaHei',
    cssValue: '微软雅黑, "Microsoft YaHei", sans-serif',
  },
  {
    label: '苹方',
    value: 'PingFang SC',
    cssValue: '"PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    label: '思源黑体',
    value: 'Source Han Sans',
    cssValue: '"Source Han Sans SC", "Noto Sans CJK SC", sans-serif',
  },
];
