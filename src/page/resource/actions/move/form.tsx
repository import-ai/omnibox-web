import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface IProps {
  namespaceId: string;
}

export default function MoveToForm(props: IProps) {
  // const { namespaceId } = props;
  const handleMove = () => {
    //
  };

  return (
    <div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="将页面移至..."
          className="pl-10 bg-white border-gray-200 rounded-lg"
        />
      </div>
      <div className="space-y-1">
        <Button
          variant="ghost"
          onClick={handleMove}
          className="w-full justify-start font-normal"
        >
          实体及关系
        </Button>
      </div>
    </div>
  );
}
