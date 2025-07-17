import { Markdown } from '@/components/markdown';
import { Resource } from '@/interface';

interface IProps {
  resource: Resource;
}

function snakeToCamelCase(text: string): string {
  const result: string = text.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', ''),
  );
  console.log({ text, result });
  return result;
}

function embedImage(resource: Resource): string {
  let content: string = resource.content || '';
  if (resource.attrs?.images) {
    const images: Record<string, string> = resource.attrs?.images || {};
    for (const [key, value] of Object.entries(images)) {
      content = content.replaceAll(
        `](${snakeToCamelCase(key)})`,
        `](data:image/jpeg;base64,${value})`,
      );
      content = content.replaceAll(
        ` src="${snakeToCamelCase(key)}"`,
        ` src="data:image/jpeg;base64,${value}"`,
      );
      console.log({ content });
    }
  }
  return content;
}

export default function Render(props: IProps) {
  const { resource } = props;

  return <Markdown content={embedImage(resource)} />;
}
