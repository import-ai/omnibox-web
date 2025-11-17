import { TagsIcon } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import MultipleSelector, { Option } from '@/components/multiple-selector';
import Space from '@/components/space';
import { Badge } from '@/components/ui/badge';
import type { Tag } from '@/interface';
import { http } from '@/lib/request';

interface IProps {
  loading: boolean;
  data: Array<Option>;
  namespaceId: string;
  resourceId: string;
}

const MAX_TAG_LENGTH = 20;

export default function Tags(props: IProps) {
  const { data, loading, resourceId, namespaceId } = props;
  const inputRef = useRef<any>(null);
  const { t } = useTranslation();
  const [value, onChange] = useState('');
  const [editing, onEditing] = useState(false);
  const [tags, setTags] = useState<Array<Option>>([]);
  const handleSearch = (val: string): Promise<Option[]> => {
    return http.get(`/namespaces/${namespaceId}/tag?name=${val}`).then(res => {
      return Promise.resolve(
        res.map((item: Tag) => ({ label: item.name, value: item.id }))
      );
    });
  };
  const enterEdit = () => {
    onEditing(true);
    setTimeout(() => {
      inputRef.current && inputRef.current.focus();
    }, 100);
  };
  const leaveEdit = () => {
    onEditing(false);
    http.patch(`/namespaces/${namespaceId}/resources/${resourceId}`, {
      namespaceId,
      tag_ids: tags.map(tag => tag.value),
    });
  };
  const handleChange = (val: Array<Option>) => {
    setTags(val);
    onChange('');
  };
  const handleCreate = (val: Option) => {
    if (val.value.length > MAX_TAG_LENGTH) {
      toast.error(t('resource.attrs.tag_too_long', { max: MAX_TAG_LENGTH }));
      return Promise.reject(new Error('Tag name too long'));
    }
    return http
      .post(`/namespaces/${namespaceId}/tag`, { name: val.value })
      .then(res => Promise.resolve({ label: res.name, value: res.id }));
  };

  useEffect(() => {
    setTags(data);
  }, [data]);

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
      <TagsIcon className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground font-medium min-w-[80px]">
        {t('resource.attrs.tag')}
      </span>
      {loading ? (
        <span className="flex items-center text-foreground h-7">
          <LoaderCircle className="transition-transform animate-spin" />
        </span>
      ) : (
        <span className="flex flex-wrap items-center text-foreground h-7">
          {editing ? (
            <MultipleSelector
              creatable
              ref={inputRef}
              value={tags}
              options={tags}
              inputValue={value}
              hideClearAllButton
              className="min-h-6"
              onSearch={handleSearch}
              onCreate={handleCreate}
              onChange={handleChange}
              createText={t('resource.attrs.create_tag')}
              inputProps={{
                className: 'py-0',
                maxLength: MAX_TAG_LENGTH,
                onBlur: leaveEdit,
                onValueChange: onChange,
              }}
            />
          ) : (
            <Space
              onClick={enterEdit}
              className="flex-wrap min-h-6 cursor-pointer"
            >
              {tags.length > 0 ? (
                tags.map(tag => <Badge key={tag.value}>{tag.label}</Badge>)
              ) : (
                <Badge variant="secondary" className="dark:bg-[#666666]">
                  {t('resource.attrs.add_tag')}
                </Badge>
              )}
            </Space>
          )}
        </span>
      )}
    </div>
  );
}
