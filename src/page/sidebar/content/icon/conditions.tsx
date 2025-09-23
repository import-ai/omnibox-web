import {
  RiFileMusicFill,
  RiFilePdf2Fill,
  RiFilePptFill,
  RiFileVideoFill,
  RiFileWordFill,
  RiMarkdownFill,
} from '@remixicon/react';
import { JSX } from 'react';
import {
  siDouban,
  siGithub,
  SimpleIcon,
  siQuora,
  siReddit,
  siTiktok,
  siYoutube,
  siZhihu,
} from 'simple-icons';

import { RedNoteIcon } from '@/assets/icons/redNoteIcon';
import { WeChatIcon } from '@/assets/icons/wechatIcon';

function siParser(icon: SimpleIcon) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill={`#${icon.hex}`}
    >
      <path d={icon.path} />
    </svg>
  );
}

interface FileIconCondition {
  field: 'mimetype' | 'original_name';
  type: 'prefix' | 'equal' | 'suffix';
  values: string[];
  icon: JSX.Element;
}

export const DOMAIN_SUFFIX_TO_ICON: Record<string, JSX.Element> = {
  'zhihu.com': siParser(siZhihu),
  'weixin.qq.com': <WeChatIcon />,
  'reddit.com': siParser(siReddit),
  'github.com': siParser(siGithub),
  'douyin.com': siParser(siTiktok),
  'tiktok.com': siParser(siTiktok),
  'douban.com': siParser(siDouban),
  'youtube.com': siParser(siYoutube),
  'xiaohongshu.com': <RedNoteIcon />,
  'quora.com': siParser(siQuora),
};

export const FILE_ICON_CONDITIONS: FileIconCondition[] = [
  {
    field: 'mimetype',
    type: 'equal',
    values: ['application/pdf'],
    icon: <RiFilePdf2Fill color="#F26D55" />,
  },
  {
    field: 'mimetype',
    type: 'prefix',
    values: ['audio/'],
    icon: <RiFileMusicFill color="#6567F0" />,
  },
  {
    field: 'mimetype',
    type: 'prefix',
    values: ['video/'],
    icon: <RiFileVideoFill color="#FF9100" />,
  },
  {
    field: 'original_name',
    type: 'suffix',
    values: ['.doc', '.docx'],
    icon: <RiFileWordFill color="#5599F2" />,
  },
  {
    field: 'original_name',
    type: 'suffix',
    values: ['.ppt', '.pptx'],
    icon: <RiFilePptFill color="#FC2B2B" />,
  },
  {
    field: 'original_name',
    type: 'suffix',
    values: ['.md'],
    icon: <RiMarkdownFill color="#8F959E" />,
  },
];
