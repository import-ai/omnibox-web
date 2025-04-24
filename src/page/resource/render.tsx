import { Markdown } from '@/components/markdown';

interface IProps {
  content: string;
}

export default function Render(props: IProps) {
  const { content } = props;

  return <Markdown content={content} />;
}
