import { useRef, useState } from 'react';
import { http } from '@/lib/request';
import Space from '@/components/space';
import { TagsIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import MultipleSelector from '@/components/multiple-selector';

interface IProps {
  data?: Array<string>;
  namespaceId: string;
  resourceId: string;
}

export default function Tags(props: IProps) {
  const { data, resourceId, namespaceId } = props;
  const inputRef = useRef<any>(null);
  const { t } = useTranslation();
  const [value, onChange] = useState('');
  const [editing, onEditing] = useState(false);
  const [tags, setTags] = useState(
    Array.isArray(data) ? data.map((tag) => ({ label: tag, value: tag })) : [],
  );
  const enterEdit = () => {
    onEditing(true);
    setTimeout(() => {
      inputRef.current && inputRef.current.focus();
    }, 100);
  };
  const leaveEdit = () => {
    onEditing(false);
    http.patch(`/namespaces/${namespaceId}/resources/${resourceId}`, {
      tags: tags.map((tag) => tag.value),
    });
  };
  const handleChange = (val: Array<{ label: string; value: string }>) => {
    setTags(val);
    onChange('');
  };

  return (
    <div className="flex items-center gap-3">
      <TagsIcon className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground font-medium min-w-[80px]">
        {t('resource.attrs.tag')}
      </span>
      <span className="flex items-center text-foreground h-7">
        {editing ? (
          <MultipleSelector
            creatable
            ref={inputRef}
            value={tags}
            options={tags}
            inputValue={value}
            hideClearAllButton
            className="min-h-6"
            onChange={handleChange}
            createText={t('resource.attrs.create_tag')}
            inputProps={{
              className: 'py-0',
              onBlur: leaveEdit,
              onValueChange: onChange,
            }}
          />
        ) : (
          <Space
            onClick={enterEdit}
            className="min-h-6 min-w-96 cursor-pointer"
          >
            {tags.length > 0 ? (
              tags.map((tag) => <Badge key={tag.value}>{tag.label}</Badge>)
            ) : (
              <Badge variant="secondary">{t('resource.attrs.add_tag')}</Badge>
            )}
          </Space>
        )}
      </span>
    </div>
  );
}
