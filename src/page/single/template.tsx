import { http } from '@/lib/request';
import { LoaderCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Markdown } from '@/components/markdown';

interface IProps {
  id: string;
}

export default function Template(props: IProps) {
  const { id } = props;
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const language = i18n.language || navigator.language || 'en';
  const [data, onData] = useState<{
    title: string;
    content: string;
  }>({
    title: '',
    content: '',
  });

  useEffect(() => {
    setLoading(true);
    http
      .get(`/${id}.${language}.md`, { baseURL: '' })
      .then((response) => {
        const [title, content] = response.split('--');
        onData({
          title: title.trim(),
          content: content.trim(),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, language]);

  return (
    <div className="min-h-screen p-8 md:p-12 lg:p-16 bg-background text-foreground dark:bg-[#262626]">
      {loading ? (
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-center justify-center w-full">
            <LoaderCircle className="transition-transform animate-spin" />
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-4xl font-bold mb-4">{data.title}</h1>
          <Markdown content={data.content} />
        </div>
      )}
    </div>
  );
}
