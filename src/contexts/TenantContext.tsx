import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export type IndustryType =
  | 'healthcare'
  | 'real_estate'
  | 'restaurant'
  | 'salon'
  | 'general';

export interface TenantConfig {
  id: string;
  tenant_id: string;
  company_name: string | null;
  industry: IndustryType;
  logo_url: string | null;
  primary_color: string | null;
  ai_name: string | null;
  ai_role: string | null;
  timezone: string | null;
  currency: string | null;
  working_days: string[] | null;
  opening_time: string | null;
  closing_time: string | null;
  vocabulary: Record<string, string> | null;
  has_whatsapp: boolean;
  has_email: boolean;
  has_voice: boolean;
  has_instagram: boolean;
  has_facebook: boolean;
  has_linkedin: boolean;
  features: Record<string, boolean> | null;
  subscription_status: string | null;
  subscription_plan?: string | null;
  ai_mode?: 'autonomous' | 'assisted' | 'manual' | null;
  ai_modules_enabled?: Record<string, boolean> | null;
}

// Industry-specific vocabulary translations
const industryVocabulary: Record<IndustryType, Record<string, string>> = {
  healthcare: {
    customer: 'Patient',
    customers: 'Patients',
    appointment: 'Consultation',
    appointments: 'Consultations',
    product: 'Treatment',
    products: 'Treatments',
    staff: 'Practitioner',
    staffs: 'Practitioners',
    deal: 'Treatment Plan',
    deals: 'Treatment Plans',
    lead: 'Patient Inquiry',
    leads: 'Patient Inquiries',
  },
  real_estate: {
    customer: 'Client',
    customers: 'Clients',
    appointment: 'Viewing',
    appointments: 'Viewings',
    product: 'Property',
    products: 'Properties',
    staff: 'Agent',
    staffs: 'Agents',
    deal: 'Transaction',
    deals: 'Transactions',
    lead: 'Property Inquiry',
    leads: 'Property Inquiries',
  },
  restaurant: {
    customer: 'Guest',
    customers: 'Guests',
    appointment: 'Reservation',
    appointments: 'Reservations',
    product: 'Menu Item',
    products: 'Menu',
    staff: 'Team Member',
    staffs: 'Team Members',
    deal: 'Catering Order',
    deals: 'Catering Orders',
    lead: 'Inquiry',
    leads: 'Inquiries',
  },
  salon: {
    customer: 'Client',
    customers: 'Clients',
    appointment: 'Booking',
    appointments: 'Bookings',
    product: 'Service',
    products: 'Services',
    staff: 'Stylist',
    staffs: 'Stylists',
    deal: 'Package',
    deals: 'Packages',
    lead: 'Client Inquiry',
    leads: 'Client Inquiries',
  },
  general: {
    customer: 'Customer',
    customers: 'Customers',
    appointment: 'Appointment',
    appointments: 'Appointments',
    product: 'Product',
    products: 'Products',
    staff: 'Staff Member',
    staffs: 'Staff Members',
    deal: 'Deal',
    deals: 'Deals',
    lead: 'Lead',
    leads: 'Leads',
  },
};

// Industry-specific deal stages
const industryDealStages: Record<IndustryType, string[]> = {
  healthcare: [
    'Inquiry',
    'Consultation Booked',
    'Consultation Done',
    'Treatment Plan',
    'Scheduled',
    'In Treatment',
    'Completed',
    'Follow-up',
    'Lost',
  ],
  real_estate: [
    'Lead',
    'Qualified',
    'Viewing Scheduled',
    'Viewing Done',
    'Offer Made',
    'Negotiation',
    'Contract',
    'Closing',
    'Won',
    'Lost',
  ],
  restaurant: [
    'Inquiry',
    'Quote Sent',
    'Confirmed',
    'Deposit Received',
    'In Progress',
    'Completed',
    'Cancelled',
  ],
  salon: [
    'Inquiry',
    'Booked',
    'In Service',
    'Completed',
    'Rebooking',
    'Lost',
  ],
  general: [
    'Lead',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Won',
    'Lost',
  ],
};

export type UserRole = 'master_admin' | 'admin' | 'manager' | 'staff';

interface TenantContextType {
  tenantId: string | null;
  tenantConfig: TenantConfig | null;
  isLoading: boolean;
  error: string | null;
  setTenantId: (id: string) => void;
  setUserTenantInfo: (tenantId: string | null, role: UserRole) => void;
  canSwitchTenant: boolean;
  translate: (term: string) => string;
  t: (term: string) => string;
  getVocabulary: () => Record<string, string>;
  getDealStages: () => string[];
  industry: IndustryType;
  isHealthcare: boolean;
  isRealEstate: boolean;
  isRestaurant: boolean;
  isSalon: boolean;
  refreshConfig: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_ID_KEY = 'zateceptionist_tenant_id';

function getInitialTenantId(): string | null {
  // Check URL param first
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTenantId = urlParams.get('tenant');
    if (urlTenantId) {
      localStorage.setItem(TENANT_ID_KEY, urlTenantId);
      return urlTenantId;
    }
  }
  // Fall back to localStorage
  return localStorage.getItem(TENANT_ID_KEY);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(getInitialTenantId);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('staff');

  const setTenantId = useCallback((id: string) => {
    localStorage.setItem(TENANT_ID_KEY, id);
    setTenantIdState(id);
  }, []);

  // Called by AuthContext after authentication to set user's tenant and role
  const setUserTenantInfo = useCallback((newTenantId: string | null, role: UserRole) => {
    setUserRole(role);
    if (newTenantId && role !== 'master_admin') {
      // Non-master admins are locked to their tenant
      localStorage.setItem(TENANT_ID_KEY, newTenantId);
      setTenantIdState(newTenantId);
    } else if (newTenantId) {
      // Master admins can have a default tenant but can switch
      if (!tenantId) {
        localStorage.setItem(TENANT_ID_KEY, newTenantId);
        setTenantIdState(newTenantId);
      }
    }
  }, [tenantId]);

  const fetchTenantConfig = useCallback(async () => {
    if (!tenantId) {
      setTenantConfig(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tenant_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setTenantConfig(data as TenantConfig);
        // Update document title
        if (data.company_name) {
          document.title = `${data.company_name} | Zateceptionist`;
        }
      } else {
        // Default config if none exists
        const defaultConfig: TenantConfig = {
          id: '',
          tenant_id: tenantId,
          company_name: 'My Business',
          industry: 'general',
          logo_url: null,
          primary_color: null,
          ai_name: 'Zate',
          ai_role: 'AI Assistant',
          timezone: 'UTC',
          currency: 'USD',
          working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          opening_time: '09:00',
          closing_time: '17:00',
          vocabulary: null,
          has_whatsapp: false,
          has_email: true,
          has_voice: false,
          has_instagram: false,
          has_facebook: false,
          has_linkedin: false,
          features: null,
          subscription_status: 'trial',
        };
        setTenantConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Error fetching tenant config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tenant config');
      // Set default config on error
      setTenantConfig({
        id: '',
        tenant_id: tenantId,
        company_name: 'My Business',
        industry: 'general',
        logo_url: null,
        primary_color: null,
        ai_name: 'Zate',
        ai_role: 'AI Assistant',
        timezone: 'UTC',
        currency: 'USD',
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        opening_time: '09:00',
        closing_time: '17:00',
        vocabulary: null,
        has_whatsapp: false,
        has_email: true,
        has_voice: false,
        has_instagram: false,
        has_facebook: false,
        has_linkedin: false,
        features: null,
        subscription_status: 'trial',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Determine if user can switch tenants (only master_admin)
  const canSwitchTenant = userRole === 'master_admin';

  const industry = useMemo(() => tenantConfig?.industry || 'general', [tenantConfig?.industry]);

  const translate = useCallback(
    (term: string): string => {
      // Check custom vocabulary first
      const customVocab = tenantConfig?.vocabulary;
      if (customVocab && customVocab[term.toLowerCase()]) {
        return customVocab[term.toLowerCase()];
      }
      // Fall back to industry vocabulary (with fallback to 'general' if industry not found)
      const vocab = industryVocabulary[industry as IndustryType] || industryVocabulary.general;
      return vocab?.[term.toLowerCase()] || term;
    },
    [tenantConfig?.vocabulary, industry]
  );

  const getVocabulary = useCallback((): Record<string, string> => {
    const baseVocab = { ...(industryVocabulary[industry as IndustryType] || industryVocabulary.general) };
    const customVocab = tenantConfig?.vocabulary;
    if (customVocab) {
      return { ...baseVocab, ...customVocab };
    }
    return baseVocab;
  }, [industry, tenantConfig?.vocabulary]);

  const getDealStages = useCallback((): string[] => {
    return industryDealStages[industry] || industryDealStages.general;
  }, [industry]);

  const isHealthcare = industry === 'healthcare';
  const isRealEstate = industry === 'real_estate';
  const isRestaurant = industry === 'restaurant';
  const isSalon = industry === 'salon';

  useEffect(() => {
    fetchTenantConfig();
  }, [fetchTenantConfig]);

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantConfig,
        isLoading,
        error,
        setTenantId,
        setUserTenantInfo,
        canSwitchTenant,
        translate,
        t: translate,
        getVocabulary,
        getDealStages,
        industry,
        isHealthcare,
        isRealEstate,
        isRestaurant,
        isSalon,
        refreshConfig: fetchTenantConfig,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export function useVocabulary() {
  const { translate, t, getVocabulary, getDealStages, industry } = useTenant();
  return { translate, t, getVocabulary, getDealStages, industry };
}
