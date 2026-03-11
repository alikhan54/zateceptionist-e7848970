import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('OAuth callback error:', error);
          navigate('/login?error=auth_failed');
          return;
        }

        if (!session) {
          navigate('/login');
          return;
        }

        // Check if user has a tenant with completed onboarding
        const { data: userRecord } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('auth_uid', session.user.id)
          .limit(1)
          .single();

        if (!userRecord?.tenant_id) {
          // New user — no tenant yet → onboarding
          navigate('/onboarding');
          return;
        }

        // Check onboarding status
        const { data: tenantConfig } = await supabase
          .from('tenant_config')
          .select('onboarding_completed')
          .eq('id', userRecord.tenant_id)
          .single();

        if (tenantConfig && tenantConfig.onboarding_completed === false) {
          // Onboarding not complete → resume
          navigate('/onboarding');
        } else {
          // Existing user with completed onboarding (or null = treat as complete)
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('OAuth callback exception:', err);
        navigate('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
