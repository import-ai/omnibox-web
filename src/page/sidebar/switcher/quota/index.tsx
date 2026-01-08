import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { StorageSection } from './storage-section';

export function RemainQuota() {
  const sections = [
    {
      title: '存储用量',
      current: '<0.12GB/5GB',
      items: [
        { label: '上传', color: 'bg-blue-500' },
        { label: '文件', color: 'bg-blue-400' },
        { label: '空间内其他用户', color: 'bg-gray-300' },
      ],
      segments: [
        { label: '上传', color: 'bg-blue-500', percentage: 1 },
        { label: '文件', color: 'bg-blue-400', percentage: 1.4 },
        { label: '其他', color: 'bg-gray-300', percentage: 97.6 },
      ],
    },
    {
      title: '音视频解析额度用量',
      current: '120分钟12秒/111119秒',
      items: [
        { label: '音频', color: 'bg-blue-500' },
        { label: '视频', color: 'bg-blue-400' },
        { label: '空间内其他用户', color: 'bg-gray-300' },
      ],
      segments: [
        { label: '音频', color: 'bg-blue-500', percentage: 30 },
        { label: '视频', color: 'bg-blue-400', percentage: 35 },
        { label: '其他', color: 'bg-gray-300', percentage: 35 },
      ],
    },
    {
      title: 'PDF/图片解析度用量',
      current: '11111页/1111111页',
      items: [
        { label: 'PDF', color: 'bg-blue-500' },
        { label: '图片', color: 'bg-blue-400' },
        { label: '空间内其他用户', color: 'bg-gray-300' },
      ],
      segments: [
        { label: 'PDF', color: 'bg-blue-500', percentage: 0.5 },
        { label: '图片', color: 'bg-blue-400', percentage: 0.5 },
        { label: '其他', color: 'bg-gray-300', percentage: 99 },
      ],
    },
  ];

  return (
    <div className="space-y-5 my-5">
      {sections.map((section, idx) => (
        <StorageSection
          key={idx}
          title={section.title}
          current={section.current}
          max={section.max}
          items={section.items}
          segments={section.segments}
        />
      ))}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1 bg-blue-500 hover:bg-blue-600">
          扩容 <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
