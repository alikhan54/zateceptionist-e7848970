import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type IndustryType =
  | 'healthcare'
  | 'real_estate'
  | 'restaurant'
  | 'salon'
  | 'retail'
  | 'construction'
  | 'hospitality'
  | 'education'
  | 'manufacturing'
  | 'general';

export interface TenantConfig {
  id: string;
  tenant_id: string;
  business_name: string;
  industry: IndustryType;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Industry-specific vocabulary translations
const industryVocabulary: Record<IndustryType, Record<string, string>> = {
  healthcare: {
    customer: 'Patient',
    customers: 'Patients',
    appointment: 'Appointment',
    appointments: 'Appointments',
    deal: 'Treatment Plan',
    deals: 'Treatment Plans',
    lead: 'Inquiry',
    leads: 'Inquiries',
    staff: 'Medical Staff',
    service: 'Treatment',
    services: 'Treatments',
  },
  real_estate: {
    customer: 'Client',
    customers: 'Clients',
    appointment: 'Viewing',
    appointments: 'Viewings',
    deal: 'Transaction',
    deals: 'Transactions',
    lead: 'Lead',
    leads: 'Leads',
    staff: 'Agents',
    service: 'Listing',
    services: 'Listings',
  },
  restaurant: {
    customer: 'Guest',
    customers: 'Guests',
    appointment: 'Reservation',
    appointments: 'Reservations',
    deal: 'Catering Order',
    deals: 'Catering Orders',
    lead: 'Inquiry',
    leads: 'Inquiries',
    staff: 'Staff',
    service: 'Menu Item',
    services: 'Menu Items',
  },
  salon: {
    customer: 'Client',
    customers: 'Clients',
    appointment: 'Appointment',
    appointments: 'Appointments',
    deal: 'Package',
    deals: 'Packages',
    lead: 'Inquiry',
    leads: 'Inquiries',
    staff: 'Stylists',
    service: 'Service',
    services: 'Services',
  },
  retail: {
    customer: 'Customer',
    customers: 'Customers',
    appointment: 'Appointment',
    appointments: 'Appointments',
    deal: 'Order',
    deals: 'Orders',
    lead: 'Lead',
    leads: 'Leads',
    staff: 'Staff',
    service: 'Product',
    services: 'Products',
  },
  construction: {
    customer: 'Client',
    customers: 'Clients',
    appointment: 'Site Visit',
    appointments: 'Site Visits',
    deal: 'Project',
    deals: 'Projects',
    lead: 'Lead',
    leads: 'Leads',
    staff: 'Team',
    service: 'Service',
    services: 'Services',
  },
  hospitality: {
    customer: 'Guest',
    customers: 'Guests',
    appointment: 'Booking',
    appointments: 'Bookings',
    deal: 'Reservation',
    deals: 'Reservations',
    lead: 'Inquiry',
    leads: 'Inquiries',
    staff: 'Staff',
    service: 'Amenity',
    services: 'Amenities',
  },
  education: {
    customer: 'Student',
    customers: 'Students',
    appointment: 'Session',
    appointments: 'Sessions',
    deal: 'Enrollment',
    deals: 'Enrollments',
    lead: 'Prospect',
    leads: 'Prospects',
    staff: 'Faculty',
    service: 'Course',
    services: 'Courses',
  },
  manufacturing: {
    customer: 'Client',
    customers: 'Clients',
    appointment: 'Meeting',
    appointments: 'Meetings',
    deal: 'Order',
    deals: 'Orders',
    lead: 'Lead',
    leads: 'Leads',
    staff: 'Team',
    service: 'Product',
    services: 'Products',
  },
  general: {
    customer: 'Customer',
    customers: 'Customers',
    appointment: 'Appointment',
    appointments: 'Appointments',
    deal: 'Deal',
    deals: 'Deals',
    lead: 'Lead',
    leads: 'Leads',
    staff: 'Staff',
    service: 'Service',
    services: 'Services',
  },
};

interface TenantContextType {
  tenantId: string | null;
  tenantConfig: TenantConfig | null;
  isLoading: boolean;
  error: string | null;
  setTenantId: (id: string) => void;
  translate: (key: string) => string;
  refreshConfig: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_ID_KEY = 'zateceptionist_tenant_id';

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(() => {
    return localStorage.getItem(TENANT_ID_KEY);
  });
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTenantId = useCallback((id: string) => {
    localStorage.setItem(TENANT_ID_KEY, id);
    setTenantIdState(id);
  }, []);

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
      } else {
        // Default config if none exists
        setTenantConfig({
          id: '',
          tenant_id: tenantId,
          business_name: 'My Business',
          industry: 'general',
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching tenant config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tenant config');
      // Set default config on error
      setTenantConfig({
        id: '',
        tenant_id: tenantId,
        business_name: 'My Business',
        industry: 'general',
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const translate = useCallback(
    (key: string): string => {
      const industry = tenantConfig?.industry || 'general';
      const vocab = industryVocabulary[industry];
      return vocab[key.toLowerCase()] || key;
    },
    [tenantConfig?.industry]
  );

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
        translate,
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
