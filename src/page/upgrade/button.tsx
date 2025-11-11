import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function UpgradeButton() {
  const navigate = useNavigate();

  return (
    <Button size="sm" onClick={() => navigate('/upgrade')}>
      升级帐户
    </Button>
  );
}
