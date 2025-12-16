import { TagsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ATTRIBUTE_STYLES } from '@/components/attributes/constants';
import MultipleSelector, { Option } from '@/components/multiple-selector';
import { Spinner } from '@/components/ui/spinner';
import type { Tag } from '@/interface';
import { http } from '@/lib/request';

import { TagsDisplay } from './display';
interface IProps {
  loading: boolean;
  data: Array<Option>;
  namespaceId: string;
  resourceId: string;
}

const MAX_TAG_LENGTH = 20;
const MAX_TAGS = 10;

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
    if (val.length > MAX_TAGS) {
      toast.error(t('resource.attrs.tag_limit', { max: MAX_TAGS }));
      return;
    }
    setTags(val);
    onChange('');
  };
  const handleCreate = (val: Option) => {
    if (tags.length >= MAX_TAGS) {
      toast.error(t('resource.attrs.tag_limit', { max: MAX_TAGS }));
      return Promise.reject(new Error('Tag limit exceeded'));
    }
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
    <div className={ATTRIBUTE_STYLES.containerStart}>
      <div className={`min-h-7 ${ATTRIBUTE_STYLES.containerLabel}`}>
        <TagsIcon className={`flex-shrink-0 ${ATTRIBUTE_STYLES.icon}`} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('resource.attrs.tag')}
        </span>
      </div>
      {loading ? (
        <span className="flex items-center text-foreground h-7">
          <Spinner />
        </span>
      ) : (
        <span className="flex flex-wrap items-center text-foreground min-h-7">
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
              badgeClassName="!border-neutral-300 !bg-transparent !text-neutral-500 !font-normal !rounded-[8px] !px-[8px] !py-[2px] !shadow-none dark:!border-neutral-500 dark:!text-neutral-400 hover:!bg-transparent"
              inputProps={{
                className:
                  'py-0 text-xs !text-neutral-500 dark:!text-neutral-400',
                maxLength: MAX_TAG_LENGTH,
                onBlur: leaveEdit,
                onValueChange: onChange,
              }}
            />
          ) : (
            <TagsDisplay data={tags} onEdit={enterEdit} />
          )}
        </span>
      )}
    </div>
  );
}
