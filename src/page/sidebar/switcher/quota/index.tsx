import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import useQuota from '@/hooks/use-quota';

import { Expiration } from './expiration';
import { StorageSection } from './storage-section';
import { formatStorage, formatTime, formatTimeAsMinutes } from './utils';

interface RemainQuotaProps {
  namespaceId: string;
}

export function RemainQuota({ namespaceId }: RemainQuotaProps) {
  const { t, i18n } = useTranslation();
  const { data } = useQuota(namespaceId);
  const showOtherMembersUsage = data.show_members_usage;

  const segTooltip = (label: string, value: string) => `${label}: ${value}`;
  const pageVal = (n: number) => `${n}${t('quota.page_unit')}`;

  const sections = [
    {
      title: t('quota.storage_usage'),
      current: `${formatStorage(data.storage_bytes.upload + data.storage_bytes.file + data.storage_bytes.other_users)}/${formatStorage(data.storage_bytes.total)}`,
      items: showOtherMembersUsage
        ? [
            { label: t('quota.upload'), color: 'bg-blue-400' },
            { label: t('quota.file'), color: 'bg-blue-500' },
            { label: t('quota.other_users'), color: 'bg-gray-300' },
          ]
        : [
            { label: t('quota.upload'), color: 'bg-blue-400' },
            { label: t('quota.file'), color: 'bg-blue-500' },
          ],
      segments: showOtherMembersUsage
        ? [
            {
              label: t('quota.upload'),
              color: 'bg-blue-400',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.upload / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.upload'),
                formatStorage(data.storage_bytes.upload)
              ),
            },
            {
              label: t('quota.file'),
              color: 'bg-blue-500',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.file / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.file'),
                formatStorage(data.storage_bytes.file)
              ),
            },
            {
              label: t('quota.other'),
              color: 'bg-gray-300',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.other_users /
                      data.storage_bytes.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.other'),
                formatStorage(data.storage_bytes.other_users)
              ),
            },
          ]
        : [
            {
              label: t('quota.upload'),
              color: 'bg-blue-400',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.upload / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.upload'),
                formatStorage(data.storage_bytes.upload)
              ),
            },
            {
              label: t('quota.file'),
              color: 'bg-blue-500',
              percentage:
                data.storage_bytes.total > 0
                  ? (data.storage_bytes.file / data.storage_bytes.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.file'),
                formatStorage(data.storage_bytes.file)
              ),
            },
          ],
    },
    {
      title: t('quota.audio_video_parse_usage'),
      current: `${formatTime(data.video_audio_parse.video + data.video_audio_parse.audio + data.video_audio_parse.other_users)}/${formatTimeAsMinutes(data.video_audio_parse.total)}`,
      items: showOtherMembersUsage
        ? [
            { label: t('quota.audio'), color: 'bg-blue-400' },
            { label: t('quota.video'), color: 'bg-blue-500' },
            { label: t('quota.other_users'), color: 'bg-gray-300' },
          ]
        : [
            { label: t('quota.audio'), color: 'bg-blue-400' },
            { label: t('quota.video'), color: 'bg-blue-500' },
          ],
      segments: showOtherMembersUsage
        ? [
            {
              label: t('quota.audio'),
              color: 'bg-blue-400',
              percentage:
                data.video_audio_parse.total > 0
                  ? (data.video_audio_parse.audio /
                      data.video_audio_parse.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.audio'),
                formatTime(data.video_audio_parse.audio)
              ),
            },
            {
              label: t('quota.video'),
              color: 'bg-blue-500',
              percentage:
                data.video_audio_parse.total > 0
                  ? (data.video_audio_parse.video /
                      data.video_audio_parse.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.video'),
                formatTime(data.video_audio_parse.video)
              ),
            },
            {
              label: t('quota.other'),
              color: 'bg-gray-300',
              percentage:
                data.video_audio_parse.total > 0
                  ? (data.video_audio_parse.other_users /
                      data.video_audio_parse.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.other'),
                formatTime(data.video_audio_parse.other_users)
              ),
            },
          ]
        : [
            {
              label: t('quota.audio'),
              color: 'bg-blue-400',
              percentage:
                data.video_audio_parse.total > 0
                  ? (data.video_audio_parse.audio /
                      data.video_audio_parse.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.audio'),
                formatTime(data.video_audio_parse.audio)
              ),
            },
            {
              label: t('quota.video'),
              color: 'bg-blue-500',
              percentage:
                data.video_audio_parse.total > 0
                  ? (data.video_audio_parse.video /
                      data.video_audio_parse.total) *
                    100
                  : 0,
              tooltip: segTooltip(
                t('quota.video'),
                formatTime(data.video_audio_parse.video)
              ),
            },
          ],
    },
    {
      title: t('quota.doc_parse_usage'),
      current: `${data.doc_parse.pdf + data.doc_parse.image + data.doc_parse.other_users}${t('quota.page_unit')}/${data.doc_parse.total}${t('quota.page_unit')}`,
      items: showOtherMembersUsage
        ? [
            { label: t('quota.pdf'), color: 'bg-blue-400' },
            { label: t('quota.image'), color: 'bg-blue-500' },
            { label: t('quota.other_users'), color: 'bg-gray-300' },
          ]
        : [
            { label: t('quota.pdf'), color: 'bg-blue-400' },
            { label: t('quota.image'), color: 'bg-blue-500' },
          ],
      segments: showOtherMembersUsage
        ? [
            {
              label: t('quota.pdf'),
              color: 'bg-blue-400',
              percentage:
                data.doc_parse.total > 0
                  ? (data.doc_parse.pdf / data.doc_parse.total) * 100
                  : 0,
              tooltip: segTooltip(t('quota.pdf'), pageVal(data.doc_parse.pdf)),
            },
            {
              label: t('quota.image'),
              color: 'bg-blue-500',
              percentage:
                data.doc_parse.total > 0
                  ? (data.doc_parse.image / data.doc_parse.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.image'),
                pageVal(data.doc_parse.image)
              ),
            },
            {
              label: t('quota.other'),
              color: 'bg-gray-300',
              percentage:
                data.doc_parse.total > 0
                  ? (data.doc_parse.other_users / data.doc_parse.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.other'),
                pageVal(data.doc_parse.other_users)
              ),
            },
          ]
        : [
            {
              label: t('quota.pdf'),
              color: 'bg-blue-400',
              percentage:
                data.doc_parse.total > 0
                  ? (data.doc_parse.pdf / data.doc_parse.total) * 100
                  : 0,
              tooltip: segTooltip(t('quota.pdf'), pageVal(data.doc_parse.pdf)),
            },
            {
              label: t('quota.image'),
              color: 'bg-blue-500',
              percentage:
                data.doc_parse.total > 0
                  ? (data.doc_parse.image / data.doc_parse.total) * 100
                  : 0,
              tooltip: segTooltip(
                t('quota.image'),
                pageVal(data.doc_parse.image)
              ),
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
              variant="default"
              className="h-[30px] w-[71px] shrink-0 text-xs font-medium"
            >
              {t('quota.expand_button')}
            </Button>
          </a>
        </div>
      </div>
      <Expiration basic={data.basic} premium={data.premium} />
    </div>
  );
}
