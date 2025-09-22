import { Check, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { OAuthAuthorizationDecision, OAuthError } from '@/interface';
import { OAuthService } from '@/lib/oauth';

interface AuthorizationFormProps {
  authorizationData: {
    client: {
      id: string;
      name: string;
      description?: string;
    };
    scope: string[];
    redirect_uri: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  };
}

export function AuthorizationForm({
  authorizationData,
}: AuthorizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDecision = async (decision: 'allow' | 'deny') => {
    setIsSubmitting(true);

    try {
      const authDecision: OAuthAuthorizationDecision = {
        client_id: authorizationData.client.id,
        redirect_uri: authorizationData.redirect_uri,
        scope: authorizationData.scope.join(' '),
        state: authorizationData.state,
        code_challenge: authorizationData.code_challenge,
        code_challenge_method: authorizationData.code_challenge_method,
        decision,
      };

      await OAuthService.submitAuthorization(authDecision);

      // The backend will handle the redirect, but in case it doesn't:
      if (decision === 'allow') {
        toast.success('Authorization granted successfully');
      } else {
        toast.info('Authorization denied');
      }

      // Redirect will be handled by the backend response
    } catch (error: any) {
      setIsSubmitting(false);

      if (error.error) {
        const oauthError = error as OAuthError;
        toast.error(
          oauthError.error_description || `OAuth error: ${oauthError.error}`
        );
      } else {
        toast.error('Failed to process authorization');
      }
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">
            Authorize {authorizationData.client.name}?
          </h3>
          <p className="text-sm text-muted-foreground">
            Do you want to allow this application to access your account with
            the permissions listed above?
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleDecision('deny')}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Deny
        </Button>
        <Button
          className="flex-1"
          onClick={() => handleDecision('allow')}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Allow
        </Button>
      </CardFooter>
    </Card>
  );
}
