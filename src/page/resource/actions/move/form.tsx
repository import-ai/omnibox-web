import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useRef, useState, useEffect } from 'react';
import { Search, LoaderCircle } from 'lucide-react';

export interface IFormProps {
  resourceId: string;
  namespaceId: string;
  onFinished?: (resouceId: string, targetId: string) => void;
}

export default function MoveToForm(props: IFormProps) {
  const { resourceId, namespaceId, onFinished } = props;
  const { t } = useTranslation();
  const [editId, onEditId] = useState('');
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [data, onData] = useState<Array<Resource>>([]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      onLoading(true);
      http
        .get(
          `/namespaces/${namespaceId}/resources/${resourceId}/search?name=${encodeURIComponent(search)}`,
        )
        .then(onData)
        .catch((err) => {
          console.log(err);
        })
        .finally(() => {
          onLoading(false);
        });
    }, 300);
  }, [search]);

  return (
    <div>
      <div className="relative mb-2">
        {loading ? (
          <LoaderCircle className="absolute left-3 top-[10px] size-4 opacity-50 transition-transform animate-spin" />
        ) : (
          <Search className="absolute left-3 top-[10px] size-4 opacity-50" />
        )}
        <Input
          value={search}
          onChange={handleChange}
          className="pl-10 rounded-lg"
          placeholder={t('actions.move_page_to')}
        />
      </div>
      <div className="space-y-1 min-h-[380px]">
        {data.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            disabled={item.id === editId}
            className="w-full justify-start font-normal"
            onClick={() => {
              onEditId(item.id);
              http
                .post(
                  `/namespaces/${namespaceId}/resources/${resourceId}/move/${item.id}`,
                )
                .then(() => {
                  onEditId('');
                  onSearch('');
                  onFinished && onFinished(resourceId, item.id);
                });
            }}
          >
            {item.name || t('untitled')}
            {item.id === editId && (
              <LoaderCircle className="transition-transform animate-spin" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
