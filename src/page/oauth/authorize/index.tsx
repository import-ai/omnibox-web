import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AuthorizationForm, ClientInfo, ScopeList } from '@/components/oauth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
  OAuthAuthorization,
  OAuthAuthorizationRequest,
  OAuthError,
} from '@/interface';
import { OAuthService } from '@/lib/oauth';

export default function OAuthAuthorizePage() {
  const [searchParams] = useSearchParams();
  const [authData, setAuthData] = useState<OAuthAuthorization | null>(null);
  const [error, setError] = useState<OAuthError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthorization = async () => {
      try {
        // Parse OAuth parameters from URL
        const authRequest: OAuthAuthorizationRequest = {
          response_type: searchParams.get('response_type') || '',
          client_id: searchParams.get('client_id') || '',
          redirect_uri: searchParams.get('redirect_uri') || '',
          scope: searchParams.get('scope') || undefined,
          state: searchParams.get('state') || undefined,
          code_challenge: searchParams.get('code_challenge') || undefined,
          code_challenge_method:
            searchParams.get('code_challenge_method') || undefined,
        };

        // Validate request parameters
        const validationErrors =
          OAuthService.validateAuthorizationRequest(authRequest);
        if (validationErrors.length > 0) {
          setError({
            error: 'invalid_request',
            error_description: validationErrors.join(', '),
          });
          setIsLoading(false);
          return;
        }

        // Get authorization details from backend
        const authorization = await OAuthService.getAuthorization(authRequest);
        setAuthData(authorization);
      } catch (err: any) {
        console.error('OAuth authorization error:', err);

        if (err.error) {
          setError(err as OAuthError);
        } else {
          setError({
            error: 'server_error',
            error_description: 'Failed to load authorization details',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthorization();
  }, [searchParams]);

  // Handle OAuth errors by redirecting back to the client
  useEffect(() => {
    if (error && authData?.redirect_uri) {
      const redirectUrl = OAuthService.buildRedirectUrl(authData.redirect_uri, {
        error: error.error,
        error_description: error.error_description,
        state: authData.state,
      });

      // Redirect after a short delay to show the error
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 3000);
    }
  }, [error, authData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">
            Loading authorization details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Authorization Error</div>
                <div>{error.error_description || error.error}</div>
                {authData?.redirect_uri && (
                  <div className="text-sm">
                    Redirecting back to the application...
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!authData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No authorization data available. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Application Authorization</h1>
          <p className="text-muted-foreground mt-2">
            Review the permissions and decide whether to grant access
          </p>
        </div>

        <ClientInfo client={authData.client} />
        <ScopeList scopes={authData.scope} />
        <AuthorizationForm authorizationData={authData} />

        <div className="text-center text-xs text-muted-foreground">
          By clicking "Allow", you agree to share the requested information with
          this application.
        </div>
      </div>
    </div>
  );
}
