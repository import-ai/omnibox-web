import { Building2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientInfoProps {
  client: {
    id: string;
    name: string;
    description?: string;
  };
}

export function ClientInfo({ client }: ClientInfoProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Application Authorization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {client.id}
          </Badge>
        </div>
        <div>
          <h3 className="text-lg font-semibold">{client.name}</h3>
          {client.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {client.description}
            </p>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          This application is requesting access to your account.
        </div>
      </CardContent>
    </Card>
  );
}
