import Chat from '@/page/chat';
import AuthPage from '@/page/auth';
import Resource from '@/page/resource';
import { IUseResource } from '@/hooks/user-resource';

export default function App(props: IUseResource) {
  if (props.resourceId === 'chat') {
    return <Chat />;
  }

  return (
    <AuthPage access>
      <Resource {...props} />
    </AuthPage>
  );
}
