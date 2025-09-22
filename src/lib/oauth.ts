import type {
  OAuthAuthorization,
  OAuthAuthorizationDecision,
  OAuthAuthorizationRequest,
  OAuthError,
  OAuthScope,
} from '@/interface';
import { http } from '@/lib/request';

export class OAuthService {
  /**
   * Get authorization details from the backend
   */
  static async getAuthorization(
    params: OAuthAuthorizationRequest
  ): Promise<OAuthAuthorization> {
    try {
      const response = await http.get('/oauth/authorize', { params });
      return response;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data as OAuthError;
      }
      throw error;
    }
  }

  /**
   * Submit authorization decision (allow/deny)
   */
  static async submitAuthorization(
    decision: OAuthAuthorizationDecision
  ): Promise<void> {
    try {
      await http.post('/oauth/authorize', decision);
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data as OAuthError;
      }
      throw error;
    }
  }

  /**
   * Get predefined OAuth scopes with descriptions
   */
  static getOAuthScopes(): Record<string, OAuthScope> {
    return {
      openid: {
        name: 'openid',
        description: 'Access to your unique identifier',
      },
      profile: {
        name: 'profile',
        description: 'Access to your basic profile information (username)',
      },
      email: {
        name: 'email',
        description: 'Access to your email address',
      },
    };
  }

  /**
   * Parse OAuth error from URL parameters
   */
  static parseOAuthError(searchParams: URLSearchParams): OAuthError | null {
    const error = searchParams.get('error');
    if (!error) return null;

    return {
      error,
      error_description: searchParams.get('error_description') || undefined,
      error_uri: searchParams.get('error_uri') || undefined,
      state: searchParams.get('state') || undefined,
    };
  }

  /**
   * Parse authorization code from URL parameters
   */
  static parseAuthorizationCode(searchParams: URLSearchParams): {
    code?: string;
    state?: string;
  } {
    return {
      code: searchParams.get('code') || undefined,
      state: searchParams.get('state') || undefined,
    };
  }

  /**
   * Validate OAuth authorization request parameters
   */
  static validateAuthorizationRequest(
    params: OAuthAuthorizationRequest
  ): string[] {
    const errors: string[] = [];

    if (!params.response_type) {
      errors.push('response_type is required');
    } else if (params.response_type !== 'code') {
      errors.push('Only authorization code flow is supported');
    }

    if (!params.client_id) {
      errors.push('client_id is required');
    }

    if (!params.redirect_uri) {
      errors.push('redirect_uri is required');
    } else {
      try {
        new URL(params.redirect_uri);
      } catch {
        errors.push('redirect_uri must be a valid URL');
      }
    }

    return errors;
  }

  /**
   * Build redirect URL with parameters
   */
  static buildRedirectUrl(
    baseUrl: string,
    params: Record<string, string | undefined>
  ): string {
    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }
}

export default OAuthService;
