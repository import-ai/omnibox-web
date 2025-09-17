import { useParams } from 'react-router-dom';

export default function Header() {
  const params = useParams();

  return (
    <div className="flex items-center w-full h-12 px-4 border-b">
      <div className="flex items-center px-2">
        <h1 className="text-sm font-small">
          {params.conversation_id ? 'Shared Chat' : 'New Shared Chat'}
        </h1>
      </div>
    </div>
  );
}
