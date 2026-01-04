// Core types for multi-tenant CRM

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
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel: 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'sms';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'ai';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  customer_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  created_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  score?: number;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  lead_id?: string;
  customer_id?: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'social';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  audience_count: number;
  sent_count: number;
  open_rate?: number;
  click_rate?: number;
  scheduled_at?: string;
  created_at: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  user_id?: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string;
  created_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
}
