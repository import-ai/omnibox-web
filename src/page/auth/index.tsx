import UnauthorizedPage from './un-auth';

interface IProps {
  access: boolean;
  children: React.ReactNode;
}

export default function AuthPage(props: IProps) {
  const { access, children } = props;

  if (!access) {
    return <UnauthorizedPage />;
  }

  return children;
}
