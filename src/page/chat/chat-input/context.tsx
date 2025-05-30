import { Resource } from '@/interface';
import Badge from '@/components/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, FileText, Folder } from 'lucide-react';

interface IProps {
  value: Array<{ type: string; resource: Resource }>;
  onChange: (value: Array<{ type: string; resource: Resource }>) => void;
}

export default function ChatContext(props: IProps) {
  const { value, onChange } = props;
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 pt-2 mt-[-8px] max-w-3xl overflow-x-auto no-scrollbar">
      {value.map((item) => (
        <Badge
          key={item.resource.id}
          slot={
            <Button
              size="icon"
              className="w-4 h-4 bg-black text-white rounded-full"
              onClick={() => {
                onChange(
                  value.filter(
                    (target) => target.resource.id !== item.resource.id,
                  ),
                );
              }}
            >
              <X />
            </Button>
          }
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigate(`/${item.resource.namespace.id}/${item.resource.id}`);
            }}
          >
            {item.type === 'folder' ? (
              <Folder className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span className="max-w-[130px] truncate">{item.resource.name}</span>
          </Button>
        </Badge>
      ))}
    </div>
  );
}
