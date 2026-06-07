import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, Zap, ArrowLeft } from 'lucide-react';

type Status = 'checking' | 'ready' | 'invalid';

/**
 * Password-reset completion page. The user arrives here from the link in the
 * Supabase recovery email (redirectTo = /reset-password). Supabase parses the
 * recovery token from the URL hash asynchronously (detectSessionInUrl=true) and
 * emits a PASSWORD_RECOVERY event, establishing a short-lived session that lets
 * us call supabase.auth.updateUser({ password }).
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // The PASSWORD_RECOVERY event can fire EITHER before or after this component
    // mounts, so guard BOTH orderings:
    //   1) onAuthStateChange  -> catches the event if it fires after we subscribe
    //   2) getSession() now   -> catches the case where the token was already
    //                            parsed before mount (session already present)
    const hash = window.location.hash || '';
    const hasRecoveryToken = /access_token=|type=recovery/.test(hash);
    const hasError = /error=|error_code=|error_description=/.test(hash);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus('ready');
      } else if (hasError || !hasRecoveryToken) {
        // No recovery in progress (no token in the URL) or Supabase reported an
        // error (expired / already-used link) -> show the fallback immediately.
        setStatus('invalid');
      }
      // else: a token is present but not parsed yet -> stay on 'checking'; the
      // listener above will flip us to 'ready' when PASSWORD_RECOVERY fires.
    });

    // Safety net: a token was present but never resolved into a session (e.g.
    // expired/invalid) -> don't strand the user on the spinner forever.
    const timeout = setTimeout(() => {
      setStatus((s) => (s === 'checking' ? 'invalid' : s));
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
      setIsSaving(false);
      return;
    }
    toast.success('Password updated — please sign in with your new password.');
    // End the temporary recovery session so the user explicitly re-authenticates
    // (and so /login's "already signed in" guard doesn't bounce them to /dashboard).
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Zate Systems</span>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Reset link invalid or expired</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  This password reset link is no longer valid. Request a new one from the login page.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
              </Button>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 text-center">
                <h1 className="text-xl font-bold">Set a new password</h1>
                <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-9 pr-9"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="pl-9"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
                  </>
                ) : (
                  'Update password'
                )}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
