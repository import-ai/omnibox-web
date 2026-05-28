import type { SVGProps } from 'react';

import { FolderFunnel } from './components/FolderFunnel';
import { FolderIcon } from './components/FolderIcon';

export function SmartFolderDefaultIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon open={false} svgPath={<FolderFunnel />} {...props} />;
}
