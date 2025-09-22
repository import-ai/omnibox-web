import { Key, Mail, Shield, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OAuthService } from '@/lib/oauth';

interface ScopeListProps {
  scopes: string[];
}

const getScopeIcon = (scope: string) => {
  switch (scope) {
    case 'openid':
      return <Key className="h-4 w-4" />;
    case 'profile':
      return <User className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

export function ScopeList({ scopes }: ScopeListProps) {
  const oauthScopes = OAuthService.getOAuthScopes();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Requested Permissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scopes.map(scope => {
            const scopeInfo = oauthScopes[scope];
            return (
              <div key={scope} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getScopeIcon(scope)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {scope}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {scopeInfo?.description || `Access to ${scope} data`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            You can revoke access to your data at any time from your account
            settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
