import type { SVGProps } from 'react';

import { FolderFunnel } from './components/folderFunnel';
import { FolderIcon } from './components/folderIcon';

export function SmartFolderDefaultIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon open={false} svgPath={<FolderFunnel />} {...props} />;
}
