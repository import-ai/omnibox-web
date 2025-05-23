import { getData } from './data';
import { Permission } from '@/interface';

interface IProps {
  level: number;
  forbidden: boolean;
  permission: Permission;
  children: React.ReactNode;
}

export default function PermissionWrapper(props: IProps) {
  const { level, permission, forbidden, children } = props;
  if (forbidden) {
    return null;
  }

  const data = getData();
  const index = data.findIndex((item) => item.value === permission);
  if (level < index) {
    return null;
  }

  return children;
}
