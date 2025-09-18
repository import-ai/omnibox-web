import parse, { domToReact } from 'html-react-parser';
import { File, Folder, FolderOpen, LucideFileScan } from 'lucide-react';
import { themeIcons } from 'seti-icons';
import {
  siDouban,
  siGithub,
  type SimpleIcon,
  siReddit,
  siTiktok,
  siWechat,
  siXiaohongshu,
  siZhihu,
} from 'simple-icons';

import { IResourceData } from '@/interface';

export interface IProps {
  expand: boolean;
  resource: IResourceData;
}

const DOMAIN_SUFFIX_TO_ICON: Record<string, SimpleIcon> = {
  'xiaohongshu.com': siXiaohongshu,
  'zhihu.com': siZhihu,
  'weixin.qq.com': siWechat,
  'reddit.com': siReddit,
  'github.com': siGithub,
  'douyin.com': siTiktok,
  'tiktok.com': siTiktok,
  'douban.com': siDouban,
};

function getIconByHostname(hostname: string) {
  for (const [suffix, icon] of Object.entries(DOMAIN_SUFFIX_TO_ICON)) {
    if (hostname.endsWith(suffix)) {
      console.log({ icon });
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
  }
  return <LucideFileScan />;
}

function getIconByFilename(filename: string) {
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
  return <File />;
}

export default function Icon(props: IProps) {
  const { expand, resource } = props;

  if (resource.resource_type === 'folder') {
    return expand ? <FolderOpen /> : <Folder />;
  }

  if (!resource.attrs) {
    return <File />;
  }

  if (resource.resource_type === 'file' && resource.attrs.original_name) {
    return getIconByFilename(resource.attrs.original_name);
  }

  if (resource.resource_type === 'link' && resource.attrs.url) {
    const url: URL = new URL(resource.attrs.url);
    return getIconByHostname(url.hostname);
  }

  return <File />;
}
