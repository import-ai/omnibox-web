import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { Product } from './product';

export default function UpgradePage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">升级帐户</h1>
        <p className="text-muted-foreground">选择适合您的套餐，解锁更多功能</p>
      </div>
      <Product />
    </div>
  );
}
