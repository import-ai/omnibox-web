import type { ReactNode } from 'react';

import type { ResourceMeta } from '@/interface';

export type ResourcePickerResource = ResourceMeta & {
  children?: ResourcePickerResource[];
  disabled?: boolean;
  disabledTooltip?: ReactNode;
};
