import type { SVGProps } from 'react';

import { FolderIcon } from './components/FolderIcon';
import { FolderRss } from './components/FolderRss';

export function RssFolderOpenIcon(props: SVGProps<SVGSVGElement>) {
  return <FolderIcon open svgPath={<FolderRss />} {...props} />;
}
