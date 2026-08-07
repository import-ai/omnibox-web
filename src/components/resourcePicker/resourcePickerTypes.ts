import type { ReactNode } from 'react';

import type { ResourceMeta, SpaceType } from '@/interface';

export type ResourcePickerResource = ResourceMeta & {
  children?: ResourcePickerResource[];
  disabled?: boolean;
  disabledTooltip?: ReactNode;
  picker_space_type?: SpaceType;
};
