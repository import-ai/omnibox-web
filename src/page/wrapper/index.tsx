import Chat from '@/page/chat';
import Resource from '@/page/resource';
import { useParams } from 'react-router-dom';

export default function App() {
  const params = useParams();
  const resourceId = params.resourceId || '';

  if (resourceId === 'chat') {
    return <Chat />;
  }

  return <Resource />;
}
