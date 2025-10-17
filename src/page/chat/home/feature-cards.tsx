import { ChevronRight, FileUp, GlobeIcon, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function FeatureCards() {
  const { t } = useTranslation();

  const suggestions: { title: string; description: string; url: string }[] = [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
      {/* Upload Files Card */}
      <Card className="dark:bg-[#303030] dark:border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            {t('chat.home.upload.title')}
          </CardTitle>
          <CardDescription className="text-base font-medium text-foreground">
            {t('chat.home.upload.subtitle')}
          </CardDescription>
          <CardDescription className="text-sm text-muted-foreground">
            {t('chat.home.upload.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileUp className="w-4 h-4 text-red-500" />
              {t('chat.home.upload.local')}
            </Button>
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 text-green-500" />
              {t('chat.home.upload.wechat')}
            </Button>
            <Button variant="outline" size="sm">
              <GlobeIcon className="w-4 h-4 text-blue-500" />
              {t('chat.home.upload.browser')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Card */}
      {suggestions.length > 0 && (
        <Card className="bg-white dark:bg-[#303030] border-gray-200 dark:border-none shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">
              {t('chat.home.suggestions.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(suggestion => (
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{suggestion.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
