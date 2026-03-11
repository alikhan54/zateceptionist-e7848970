import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * OAuth callback page for channel connections (Facebook, Google Business, etc.)
 * Opens in a popup, posts message back to parent window, then auto-closes.
 */
export default function OAuthChannelCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting your account...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || 'Authorization was denied');

      // Notify parent
      if (window.opener) {
        window.opener.postMessage(
          { type: 'oauth_callback', error: errorDescription || error },
          window.location.origin
        );
      }
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Invalid callback — missing authorization code');
      return;
    }

    // Post the code back to the parent window for token exchange
    setStatus('success');
    setMessage('Connected! Closing...');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'oauth_callback', code, state },
        window.location.origin
      );

      // Auto-close popup after brief delay
      setTimeout(() => window.close(), 1500);
    } else {
      setMessage('Connected! You can close this window.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-lg text-green-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="text-lg text-red-600">{message}</p>
            <button
              onClick={() => window.close()}
              className="text-sm text-primary underline"
            >
              Close this window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
