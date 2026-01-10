import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, User, Session } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';

export type UserRole = 'master_admin' | 'admin' | 'manager' | 'staff';

export interface StaffPermissions {
  can_access_inbox: boolean;
  can_access_appointments: boolean;
  can_access_customers: boolean;
  can_access_tasks: boolean;
  can_access_sales: boolean;
  can_access_marketing: boolean;
  can_access_hr: boolean;
  can_access_operations: boolean;
  can_access_analytics: boolean;
  can_access_settings: boolean;
  can_send_messages: boolean;
  can_take_over_ai: boolean;
  can_view_all_conversations: boolean;
  can_view_leads: boolean;
  can_use_ai_features: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  tenant_id: string | null;
  is_active: boolean;
  staffPermissions?: StaffPermissions;
}

// Permission definitions per role
const rolePermissions: Record<UserRole, string[]> = {
  master_admin: [
    'manage_tenants',
    'manage_users',
    'manage_roles',
    'view_analytics',
    'manage_settings',
    'manage_billing',
    'manage_integrations',
    'manage_campaigns',
    'manage_customers',
    'manage_deals',
    'manage_appointments',
    'manage_inbox',
    'manage_hr',
    'view_all',
    'edit_all',
    'delete_all',
  ],
  admin: [
    'manage_users',
    'view_analytics',
    'manage_settings',
    'manage_integrations',
    'manage_campaigns',
    'manage_customers',
    'manage_deals',
    'manage_appointments',
    'manage_inbox',
    'manage_hr',
    'view_all',
    'edit_all',
    'delete_all',
  ],
  manager: [
    'view_analytics',
    'manage_campaigns',
    'manage_customers',
    'manage_deals',
    'manage_appointments',
    'manage_inbox',
    'view_team',
    'edit_team',
  ],
  staff: [
    'view_customers',
    'manage_appointments',
    'manage_inbox',
    'view_own',
    'edit_own',
  ],
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  hasPermission: (permission: string) => boolean;
  refreshAuthUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUserTenantInfo } = useTenant();

  // Fetch user profile and role from database
  const fetchAuthUser = useCallback(async (authId: string) => {
    try {
      // Fetch user from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return null;
      }

      if (!userData) {
        // User doesn't exist in users table yet, return default
        return null;
      }

      // Fetch user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
      }

      const userRole = (roleData?.role as UserRole) || 'staff';

      // Fetch staff permissions if user is staff
      let staffPermissions: StaffPermissions | undefined;
      if (userRole === 'staff') {
        const { data: permData } = await supabase
          .from('staff_permissions')
          .select('*')
          .eq('user_id', userData.id)
          .maybeSingle();
        
        if (permData) {
          staffPermissions = {
            can_access_inbox: permData.can_access_inbox ?? true,
            can_access_appointments: permData.can_access_appointments ?? true,
            can_access_customers: permData.can_access_customers ?? false,
            can_access_tasks: permData.can_access_tasks ?? true,
            can_access_sales: permData.can_access_sales ?? false,
            can_access_marketing: permData.can_access_marketing ?? false,
            can_access_hr: permData.can_access_hr ?? false,
            can_access_operations: permData.can_access_operations ?? false,
            can_access_analytics: permData.can_access_analytics ?? false,
            can_access_settings: permData.can_access_settings ?? false,
            can_send_messages: permData.can_send_messages ?? true,
            can_take_over_ai: permData.can_take_over_ai ?? false,
            can_view_all_conversations: permData.can_view_all_conversations ?? false,
            can_view_leads: permData.can_view_leads ?? false,
            can_use_ai_features: permData.can_use_ai_features ?? true,
          };
        }
      }

      const authUserData: AuthUser = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
        role: userRole,
        tenant_id: userData.tenant_id,
        is_active: userData.is_active ?? true,
        staffPermissions,
      };

      // Update TenantContext with user's tenant and role
      setUserTenantInfo(userData.tenant_id, userRole);

      return authUserData;
    } catch (error) {
      console.error('Error in fetchAuthUser:', error);
      return null;
    }
  }, [setUserTenantInfo]);

  const refreshAuthUser = useCallback(async () => {
    if (user?.id) {
      const fetchedUser = await fetchAuthUser(user.id);
      setAuthUser(fetchedUser);
    }
  }, [user?.id, fetchAuthUser]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer fetching user data to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchAuthUser(session.user.id).then(setAuthUser);
          }, 0);
        } else {
          setAuthUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchAuthUser(session.user.id).then(setAuthUser);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchAuthUser]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!authUser) return false;
    const permissions = rolePermissions[authUser.role] || [];
    return permissions.includes(permission);
  }, [authUser]);

  const isMasterAdmin = authUser?.role === 'master_admin';
  const isAdmin = authUser?.role === 'admin' || isMasterAdmin;
  const isManager = authUser?.role === 'manager' || isAdmin;
  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authUser,
        isAuthenticated,
        isLoading,
        login,
        signUp,
        signOut,
        logout: signOut,
        isMasterAdmin,
        isAdmin,
        isManager,
        hasPermission,
        refreshAuthUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
