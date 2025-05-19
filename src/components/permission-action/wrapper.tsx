import { getData } from './data';
import { Permission } from '@/interface';

interface IProps {
  level: number;
  permission: Permission;
  children: React.ReactNode;
}

export default function Wrapper(props: IProps) {
  const { level, permission, children } = props;
  const data = getData();
  const index = data.findIndex((item) => item.value === permission);

  if (level < index) {
    return null;
  }

  return children;
}
