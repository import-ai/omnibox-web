import { getData } from './data';
import { Permission, SpaceType } from '@/interface';

interface IProps {
  requiredPermission: number;
  forbidden: boolean;
  permission: Permission;
  spaceType?: SpaceType;
  children: React.ReactNode;
}

export default function PermissionWrapper(props: IProps) {
  const { requiredPermission, permission, forbidden, spaceType, children } =
    props;
  if (forbidden || spaceType === 'private') {
    return null;
  }

  const data = getData();
  const index = data.findIndex(item => item.value === permission);
  if (requiredPermission < index) {
    return null;
  }

  return children;
}
