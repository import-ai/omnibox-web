import {
  RiFileImageFill,
  RiFileMusicFill,
  RiFilePdf2Fill,
  RiFilePptFill,
  RiFileVideoFill,
  RiFileWordFill,
  RiMarkdownFill,
} from '@remixicon/react';
import parse, { domToReact } from 'html-react-parser';
import { File, FileText, Folder, FolderOpen, Globe } from 'lucide-react';
import { JSX } from 'react';
import { themeIcons } from 'seti-icons';
import {
  siBilibili,
  siDouban,
  SimpleIcon,
  siQuora,
  siReddit,
  siYoutube,
  siZhihu,
} from 'simple-icons';

import { GithubIcon } from '@/assets/icons/githubIcon';
import { ITHomeIcon } from '@/assets/icons/itHomeIcon.tsx';
import { OKJikeIcon } from '@/assets/icons/okJikeIcon.tsx';
import { RedNoteIcon } from '@/assets/icons/redNoteIcon';
import { Tiktok } from '@/assets/icons/tiktok.tsx';
import { WeChatIcon } from '@/assets/icons/wechatIcon';
import { ResourceMeta } from '@/interface';
import { safeParseURL } from '@/lib/utils';

import { TextIcon } from './textIcon';

export interface IProps {
  expand: boolean;
  resource: ResourceMeta;
}

const DefaultIcon = {
  link: <Globe color="#4876ff" />,
  file: <File />,
  doc: <FileText className="scale-110" />,
};

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

const DOMAIN_SUFFIX_TO_ICON: Record<string, JSX.Element> = {
  'zhihu.com': siParser(siZhihu),
  'weixin.qq.com': <WeChatIcon />,
  'okjike.com': <OKJikeIcon />,
  'ithome.com': <ITHomeIcon />,
  'reddit.com': siParser(siReddit),
  'github.com': <GithubIcon />,
  'douyin.com': <Tiktok />,
  'tiktok.com': <Tiktok />,
  'douban.com': siParser(siDouban),
  'youtube.com': siParser(siYoutube),
  'youtu.be': siParser(siYoutube),
  'xiaohongshu.com': <RedNoteIcon />,
  'xhslink.com': <RedNoteIcon />,
  'quora.com': siParser(siQuora),
  'bilibili.com': siParser(siBilibili),
  'b23.tv': siParser(siBilibili),
};

interface FileIconCondition {
  field: 'mimetype' | 'original_name';
  type: 'prefix' | 'equal' | 'suffix';
  values: string[];
  icon: JSX.Element;
}

const FILE_ICON_CONDITIONS: FileIconCondition[] = [
  {
    field: 'mimetype',
    type: 'equal',
    values: ['application/pdf'],
    icon: <RiFilePdf2Fill color="#F26D55" size={16} className="scale-125" />,
  },
  {
    field: 'mimetype',
    type: 'prefix',
    values: ['audio/'],
    icon: <RiFileMusicFill color="#6567F0" size={16} className="scale-125" />,
  },
  {
    field: 'mimetype',
    type: 'prefix',
    values: ['video/'],
    icon: <RiFileVideoFill color="#FF9100" size={16} className="scale-125" />,
  },
  {
    field: 'original_name',
    type: 'suffix',
    values: ['.doc', '.docx'],
    icon: <RiFileWordFill color="#5599F2" size={16} className="scale-125" />,
  },
  {
    field: 'original_name',
    type: 'suffix',
    values: ['.ppt', '.pptx'],
    icon: <RiFilePptFill color="#EB313C" size={16} className="scale-125" />,
  },
  {
    field: 'original_name',
    type: 'suffix',
    values: ['.md'],
    icon: <RiMarkdownFill color="#8F959E" size={16} className="scale-125" />,
  },
  {
    field: 'original_name',
    type: 'suffix',
    values: ['.jpg', '.jpeg', '.png'],
    icon: <RiFileImageFill size={16} className="scale-125 fill-rose-500" />,
  },
];

function getIconForLink(resource: ResourceMeta) {
  const urlString = (resource as any).url || resource.attrs?.url;
  if (!urlString) {
    return DefaultIcon.link;
  }

  const url = safeParseURL(urlString);
  if (!url) {
    return DefaultIcon.link;
  }

  const hostname = url.hostname;
  for (const [suffix, icon] of Object.entries(DOMAIN_SUFFIX_TO_ICON)) {
    if (hostname.endsWith(suffix)) {
      return icon;
    }
  }
  return DefaultIcon.link;
}

function getIconForFile(resource: ResourceMeta) {
  if (!resource.attrs || Object.keys(resource.attrs).length <= 0) {
    return DefaultIcon.file;
  }

  for (const condition of FILE_ICON_CONDITIONS) {
    const value: string =
      (condition.field === 'mimetype'
        ? resource.attrs.mimetype
        : resource.attrs.original_name) || '';
    for (const target of condition.values) {
      if (condition.type === 'equal' && value === target) {
        return condition.icon;
      }
      if (condition.type === 'prefix' && value.startsWith(target)) {
        return condition.icon;
      }
      if (condition.type === 'suffix' && value.endsWith(target)) {
        return condition.icon;
      }
    }
  }

  const filename = resource.attrs.original_name || '';

  const ext: string = filename.slice(filename.indexOf('.'));

  if (ext.toLowerCase() === '.txt') {
    return <TextIcon className="scale-125" />;
  }

  const getIcon = themeIcons({
    blue: '#519aba',
    grey: '#4d5a5e',
    'grey-light': '#6d8086',
    green: '#8dc149',
    orange: '#e37933',
    pink: '#f55385',
    purple: '#a074c4',
    red: '#cc3e44',
    white: '#d4d7d6',
    yellow: '#cbcb41',
    ignore: '#41535b',
  });
  const { svg, color } = getIcon(filename);

  if (svg) {
    return parse(svg, {
      replace(domNode: any) {
        if (domNode.type === 'tag' && domNode.name === 'svg') {
          return (
            <svg
              width="24"
              height="24"
              fill={color}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="lucide transition-transform scale-150"
              {...domNode.attribs}
            >
              {domToReact(domNode.children)}
            </svg>
          );
        }
      },
    });
  }
  return DefaultIcon.file;
}

export default function ResourceIcon(props: IProps) {
  const { expand, resource } = props;
  if (resource.resource_type === 'folder') {
    return expand ? <FolderOpen /> : <Folder />;
  }
  if (resource.resource_type === 'file') {
    return getIconForFile(resource);
  }
  if (resource.resource_type === 'link') {
    return getIconForLink(resource);
  }
  return DefaultIcon.doc;
}
