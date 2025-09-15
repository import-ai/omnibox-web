import { useParams } from 'react-router-dom';

export default function TitleSection() {
  const params = useParams();

  return (
    <div className="flex items-center px-2">
      <h1 className="text-sm font-small">
        {params.conversation_id ? 'Shared Chat' : 'New Shared Chat'}
      </h1>
    </div>
  );
}
