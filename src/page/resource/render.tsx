import { Markdown } from '@/components/markdown';
import { Resource } from '@/interface';

interface IProps {
  resource: Resource;
}

function embedImage(resource: Resource): string {
  let content: string = resource.content || '';
  if (resource.attrs?.images) {
    const images: Record<string, string> = resource.attrs?.images || {};
    for (const [key, value] of Object.entries(images)) {
      content = content.replaceAll(
        `(${key})`,
        `(data:image/jpeg;base64,${value})`,
      );
    }
  }
  return content;
}

export default function Render(props: IProps) {
  const { resource } = props;

  return <Markdown content={embedImage(resource)} />;
}
