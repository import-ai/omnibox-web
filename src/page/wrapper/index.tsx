import Chat from '@/page/chat';
import Resource from '@/page/resource';
import { IUseResource } from '@/hooks/user-resource';

export default function App(props: IUseResource) {
  if (props.resource_id === 'chat') {
    return <Chat />;
  }

  return <Resource {...props} />;
}
