import { Markdown } from '@/components/markdown';

interface IProps {
  title: string;
  content: string;
}

export default function Template(props: IProps) {
  const { title, content } = props;

  return (
    <div className="min-h-screen p-8 md:p-12 lg:p-16 bg-background text-foreground dark:bg-[#262626]">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <div className="pl-5">
          <Markdown content={content} />
        </div>
      </div>
    </div>
  );
}
