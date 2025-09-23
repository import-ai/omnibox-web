import parse, { domToReact } from 'html-react-parser';
import { File, Folder, FolderOpen, Globe } from 'lucide-react';
import { themeIcons } from 'seti-icons';

import { IResourceData } from '@/interface';
import {
  DOMAIN_SUFFIX_TO_ICON,
  FILE_ICON_CONDITIONS,
} from '@/page/sidebar/content/icon/conditions';

export interface IProps {
  expand: boolean;
  resource: IResourceData;
}

const DefaultIcon = { link: <Globe color="#4876ff" />, file: <File /> };

function getIconForLink(resource: IResourceData) {
  if (!resource.attrs?.url) {
    return DefaultIcon.link;
  }
  const url: URL = new URL(resource.attrs.url);
  const hostname = url.hostname;
  for (const [suffix, icon] of Object.entries(DOMAIN_SUFFIX_TO_ICON)) {
    if (hostname.endsWith(suffix)) {
      return icon;
    }
  }
  return DefaultIcon.link;
}

function getIconForFile(resource: IResourceData) {
  if (!resource.attrs) {
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

  const filename = resource.attrs.original_name;
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

export default function Icon(props: IProps) {
  const { expand, resource } = props;

  if (resource.resource_type === 'folder') {
    return expand ? <FolderOpen /> : <Folder />;
  }

  if (!resource.attrs) {
    return <File />;
  }

  if (resource.resource_type === 'file') {
    return getIconForFile(resource);
  }

  if (resource.resource_type === 'link') {
    return getIconForLink(resource);
  }

  return <File />;
}
