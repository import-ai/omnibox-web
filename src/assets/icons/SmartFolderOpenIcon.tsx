import type { SVGProps } from 'react';

import { FolderFunnel } from './components/FolderFunnel';
import { FolderIcon } from './components/FolderIcon';

export function SmartFolderOpenIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon open svgPath={<FolderFunnel />} {...props} />;
}
