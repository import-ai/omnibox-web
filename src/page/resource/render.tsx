import { Markdown } from '@/components/markdown';
import { Resource } from '@/interface';

interface IProps {
  resource: Resource;
  linkBase?: string;
}

interface Image {
  name?: string;
  link: string;
  data: string;
  mimetype: string;
}

function embedImage(resource: Resource): string {
  let content: string = resource.content || '';
  if (resource.attrs?.images) {
    const images: Image[] = resource.attrs?.images || [];
    for (const image of images) {
      if (!image.data || !image.link || !image.mimetype) {
        continue;
      }
      content = content.replaceAll(
        image.link,
        `data:${image.mimetype};base64,${image.data}`
      );
    }
  }
  return content;
}

export default function Render(props: IProps) {
  const { resource, linkBase } = props;

  return <Markdown content={embedImage(resource)} linkBase={linkBase} />;
}
