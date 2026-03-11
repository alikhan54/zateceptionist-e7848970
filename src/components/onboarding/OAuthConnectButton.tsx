import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';

const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/business.manage',
    ],
    color: '#4285F4',
    clientIdEnv: 'VITE_GOOGLE_CLIENT_ID',
  },
  facebook: {
    name: 'Meta Business',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: [
      'email',
      'public_profile',
      'pages_show_list',
      'pages_messaging',
      'pages_manage_metadata',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_manage_messages',
    ],
    color: '#1877F2',
    clientIdEnv: 'VITE_FACEBOOK_APP_ID',
  },
} as const;

type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

interface OAuthConnectButtonProps {
  provider: OAuthProvider;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  label?: string;
  connected?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function OAuthConnectButton({
  provider,
  onSuccess,
  onError,
  label,
  connected = false,
  size = 'default',
}: OAuthConnectButtonProps) {
  const { tenantId } = useTenant();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = OAUTH_PROVIDERS[provider];
  const clientId = import.meta.env[config.clientIdEnv] || '';
  const redirectUri = `${window.location.origin}/auth/oauth/channel-callback`;

  // Listen for OAuth callback messages from popup
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== 'oauth_callback') return;

    const { code, state, error: oauthError } = event.data;

    if (oauthError) {
      setError(oauthError);
      setIsConnecting(false);
      onError?.(oauthError);
      return;
    }

    if (code && state) {
      // Exchange code for tokens via n8n
      exchangeToken(code, state);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const exchangeToken = async (code: string, stateStr: string) => {
    try {
      const stateData = JSON.parse(stateStr);
      const response = await callWebhook(
        WEBHOOKS.OAUTH_EXCHANGE_TOKEN,
        {
          provider: stateData.provider || provider,
          code,
          redirect_uri: redirectUri,
        },
        tenantId || ''
      );

      if (response.success) {
        setIsConnecting(false);
        onSuccess?.(response.data);
      } else {
        throw new Error(response.error || 'Token exchange failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setIsConnecting(false);
      onError?.(message);
    }
  };

  const handleConnect = () => {
    if (!clientId) {
      setError(`${config.name} OAuth not configured. Please add ${config.clientIdEnv} to environment.`);
      return;
    }

    setIsConnecting(true);
    setError(null);

    const state = JSON.stringify({
      tenant_id: tenantId,
      provider,
      timestamp: Date.now(),
    });

    const scopeSeparator = provider === 'facebook' ? ',' : ' ';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(scopeSeparator),
      response_type: 'code',
      state,
      ...(provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : {}),
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    // Open popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      `oauth_${provider}`,
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    // Monitor popup close
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        // If still connecting after popup closed without callback, it was cancelled
        setTimeout(() => {
          setIsConnecting((current) => {
            if (current) {
              return false;
            }
            return current;
          });
        }, 1000);
      }
    }, 500);
  };

  if (connected) {
    return (
      <Badge variant="outline" className="border-green-500 text-green-600 px-3 py-1">
        <Check className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size={size}
        onClick={handleConnect}
        disabled={isConnecting}
        className="shrink-0"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        {label || `Connect ${config.name}`}
      </Button>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
