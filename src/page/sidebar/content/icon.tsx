import { themeIcons } from 'seti-icons';
import { IResourceData } from '@/interface';
import parse, { domToReact } from 'html-react-parser';
import { File, Folder, FolderOpen } from 'lucide-react';

export interface IProps {
  expand: boolean;
  resource: IResourceData;
}

export default function Icon(props: IProps) {
  const { expand, resource } = props;

  if (resource.resource_type === 'folder') {
    return expand ? <FolderOpen /> : <Folder />;
  }

  if (resource.attrs && resource.attrs.original_name) {
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
    const { svg, color } = getIcon(resource.attrs.original_name);

    return svg ? (
      parse(svg, {
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
      })
    ) : (
      <File />
    );
  }

  return <File />;
}
