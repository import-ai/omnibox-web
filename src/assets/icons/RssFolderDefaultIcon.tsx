import type { SVGProps } from 'react';

import { FolderIcon } from './components/FolderIcon';
import { FolderRss } from './components/FolderRss';

export function RssFolderDefaultIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon open={false} svgPath={<FolderRss />} {...props} />;
}
