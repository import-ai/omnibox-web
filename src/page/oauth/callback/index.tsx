import { ArrowLeft, CheckCircle, Copy, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OAuthError } from '@/interface';
import { OAuthService } from '@/lib/oauth';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [authorizationCode, setAuthorizationCode] = useState<string | null>(
    null
  );
  const [state, setState] = useState<string | null>(null);
  const [error, setError] = useState<OAuthError | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Parse OAuth response from URL parameters
    const oauthError = OAuthService.parseOAuthError(searchParams);
    if (oauthError) {
      setError(oauthError);
      return;
    }

    const { code, state: responseState } =
      OAuthService.parseAuthorizationCode(searchParams);
    if (code) {
      setAuthorizationCode(code);
      setState(responseState || null);
    } else {
      setError({
        error: 'invalid_request',
        error_description: 'No authorization code or error received',
      });
    }
  }, [searchParams]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Authorization Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">{error.error}</div>
                    {error.error_description && (
                      <div>{error.error_description}</div>
                    )}
                    {error.state && (
                      <div className="text-sm">
                        State:{' '}
                        <code className="bg-muted px-1 rounded">
                          {error.state}
                        </code>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground">
                The authorization request was denied or failed. You can close
                this window or try again.
              </div>

              <Button onClick={goBack} variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (authorizationCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Authorization Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your authorization was successful. The application has been
                  granted access to your account with the requested permissions.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">
                    Authorization Code:
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 bg-muted p-2 rounded text-sm font-mono break-all">
                      {authorizationCode}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(authorizationCode)}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {state && (
                  <div>
                    <label className="text-sm font-medium">State:</label>
                    <div className="mt-1">
                      <code className="bg-muted p-2 rounded text-sm font-mono break-all block">
                        {state}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                This authorization code can be used by the application to obtain
                access tokens. You can safely close this window.
              </div>

              <div className="space-y-2">
                <Button onClick={() => window.close()} className="w-full">
                  Close Window
                </Button>
                <Button onClick={goBack} variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Processing OAuth callback...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
