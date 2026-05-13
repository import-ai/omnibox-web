import type { SVGProps } from 'react';

import { FolderFunnel } from './components/folderFunnel';
import { FolderIcon } from './components/folderIcon';

export function SmartFolderOpenIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon open svgPath={<FolderFunnel />} {...props} />;
}
