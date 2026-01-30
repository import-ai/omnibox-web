import { SquareArrowOutUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import useQuota from '@/hooks/use-quota';

import { Expiration } from './expiration';
import { StorageSection } from './storage-section';
import { formatStorage, formatTime } from './utils';

interface RemainQuotaProps {
  namespaceId: string;
}

export function RemainQuota({ namespaceId }: RemainQuotaProps) {
  const { t, i18n } = useTranslation();
  const { data } = useQuota(namespaceId);

  const sections = [
    {
      title: t('quota.storage_usage'),
      current: `<${formatStorage(data.storage.upload + data.storage.file + data.storage.other_users)}/${formatStorage(data.storage.total)}`,
      items: [
        { label: t('quota.upload'), color: 'bg-blue-400' },
        { label: t('quota.file'), color: 'bg-blue-500' },
        { label: t('quota.other_users'), color: 'bg-gray-300' },
      ],
      segments: [
        {
          label: t('quota.upload'),
          color: 'bg-blue-400',
          percentage: (data.storage.upload / data.storage.total) * 100,
        },
        {
          label: t('quota.file'),
          color: 'bg-blue-500',
          percentage: (data.storage.file / data.storage.total) * 100,
        },
        {
          label: t('quota.other'),
          color: 'bg-gray-300',
          percentage: (data.storage.other_users / data.storage.total) * 100,
        },
      ],
    },
    {
      title: t('quota.audio_video_parse_usage'),
      current: `${formatTime(data.video_audio_parse.video + data.video_audio_parse.audio + data.video_audio_parse.other_users)}/${formatTime(data.video_audio_parse.total)}`,
      items: [
        { label: t('quota.audio'), color: 'bg-blue-400' },
        { label: t('quota.video'), color: 'bg-blue-500' },
        { label: t('quota.other_users'), color: 'bg-gray-300' },
      ],
      segments: [
        {
          label: t('quota.audio'),
          color: 'bg-blue-400',
          percentage:
            (data.video_audio_parse.audio / data.video_audio_parse.total) * 100,
        },
        {
          label: t('quota.video'),
          color: 'bg-blue-500',
          percentage:
            (data.video_audio_parse.video / data.video_audio_parse.total) * 100,
        },
        {
          label: t('quota.other'),
          color: 'bg-gray-300',
          percentage:
            (data.video_audio_parse.other_users /
              data.video_audio_parse.total) *
            100,
        },
      ],
    },
    {
      title: t('quota.doc_parse_usage'),
      current: `${data.doc_parse.pdf + data.doc_parse.image + data.doc_parse.other_users}${t('quota.page_unit')}/${data.doc_parse.total}${t('quota.page_unit')}`,
      items: [
        { label: t('quota.pdf'), color: 'bg-blue-400' },
        { label: t('quota.image'), color: 'bg-blue-500' },
        { label: t('quota.other_users'), color: 'bg-gray-300' },
      ],
      segments: [
        {
          label: t('quota.pdf'),
          color: 'bg-blue-400',
          percentage: (data.doc_parse.pdf / data.doc_parse.total) * 100,
        },
        {
          label: t('quota.image'),
          color: 'bg-blue-500',
          percentage: (data.doc_parse.image / data.doc_parse.total) * 100,
        },
        {
          label: t('quota.other'),
          color: 'bg-gray-300',
          percentage: (data.doc_parse.other_users / data.doc_parse.total) * 100,
        },
      ],
    },
  ];

  return (
    <div className="my-5">
      <div className="space-y-5">
        {sections.map((section, idx) => (
          <StorageSection
            key={idx}
            title={section.title}
            current={section.current}
            items={section.items}
            segments={section.segments}
          />
        ))}
        <div className="flex justify-end">
          <a
            href={`/${i18n.language === 'en-US' ? 'en' : 'zh-cn'}/pricing`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="sm"
              className="gap-1 text-white bg-blue-500 hover:bg-blue-600"
            >
              {t('quota.expand_button')} <SquareArrowOutUpRight />
            </Button>
          </a>
        </div>
      </div>
      {data.expire_date && <Expiration expireDate={data.expire_date} />}
    </div>
  );
}
