import { ScanForm } from './scan-form';
import { MoveLeft } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';

interface IProps {
  onScan: (value: boolean) => void;
}

export default function Scan(props: IProps) {
  const { onScan } = props;
  const { t } = useTranslation();
  const handleBack = () => {
    onScan(false);
  };

  return (
    <>
      <ScanForm />
      <Button
        variant="outline"
        onClick={handleBack}
        className="w-full [&_svg]:size-5 [&_svg]:relative [&_svg]:top-[2px] dark:[&_svg]:fill-white"
      >
        <MoveLeft />
        {t('login.back')}
      </Button>
    </>
  );
}
