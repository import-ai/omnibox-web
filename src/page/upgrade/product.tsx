import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ProductPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  buttonText: string;
}

const products: ProductPlan[] = [
  {
    id: '022cbb4d-19ea-41bb-a3cd-ce7d5b61e14a',
    name: '基础版',
    description: '适合个人用户和小型项目',
    price: '¥99',
    period: '/月',
    buttonText: '选择基础版',
    features: [
      '10GB 存储空间',
      '基础功能访问',
      '邮件支持',
      '每月 1000 次 API 调用',
      '单用户使用',
    ],
  },
  {
    id: '03b8f767-2fb4-4326-9121-d0ba8bb97d42',
    name: '专业版',
    description: '适合成长中的团队和企业',
    price: '¥299',
    period: '/月',
    buttonText: '选择专业版',
    popular: true,
    features: [
      '100GB 存储空间',
      '全部高级功能',
      '优先邮件和在线支持',
      '每月 10000 次 API 调用',
      '最多 5 个用户',
      '自定义域名',
      '高级分析报告',
    ],
  },
  {
    id: '0adafefa-92c2-4d91-ac3c-d7743f6c6809',
    name: '企业版',
    description: '适合大型团队和企业',
    price: '¥999',
    period: '/月',
    buttonText: '选择企业版',
    features: [
      '无限存储空间',
      '全部功能 + 定制化',
      '7x24 专属客服支持',
      '无限 API 调用',
      '无限用户',
      '自定义域名',
      '高级分析报告',
      'SLA 保障',
      '专属客户经理',
    ],
  },
];

export function Product() {
  const navigate = useNavigate();

  const handlePurchase = (productId: string) => {
    navigate(`/upgrade/payment?productId=${productId}`);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map(product => (
          <Card
            key={product.id}
            className={`relative flex flex-col ${
              product.popular
                ? 'border-primary shadow-lg scale-105'
                : 'border-border'
            }`}
          >
            {product.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  最受欢迎
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <CardDescription className="text-sm">
                {product.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{product.price}</span>
                <span className="text-muted-foreground text-sm">
                  {product.period}
                </span>
              </div>

              <ul className="space-y-3">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handlePurchase(product.id)}
              >
                {product.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>所有套餐均支持随时取消，按月计费无需长期承诺</p>
      </div>
    </div>
  );
}
