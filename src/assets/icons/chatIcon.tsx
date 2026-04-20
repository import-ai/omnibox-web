import logoUrl from '@/assets/logo.svg';

interface IProps {
  className?: string;
}

export function ChatIcon(props: IProps) {
  const { className } = props;

  return <img src={logoUrl} alt="OmniBox Logo" className={className} />;
}
