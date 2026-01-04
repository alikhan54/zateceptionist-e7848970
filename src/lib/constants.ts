import {
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// LEAD GRADES
// ============================================

export const LEAD_GRADES = {
  A: { label: 'A', color: 'bg-green-500', textColor: 'text-green-700', description: 'Hot lead, high intent' },
  B: { label: 'B', color: 'bg-blue-500', textColor: 'text-blue-700', description: 'Warm lead, moderate interest' },
  C: { label: 'C', color: 'bg-amber-500', textColor: 'text-amber-700', description: 'Cool lead, needs nurturing' },
  D: { label: 'D', color: 'bg-gray-500', textColor: 'text-gray-700', description: 'Cold lead, low priority' },
} as const;

export type LeadGrade = keyof typeof LEAD_GRADES;

// Lead score ranges for grades
export const LEAD_SCORE_RANGES = {
  A: { min: 80, max: 100 },
  B: { min: 60, max: 79 },
  C: { min: 40, max: 59 },
  D: { min: 0, max: 39 },
} as const;

export function getLeadGrade(score: number): LeadGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

// ============================================
// STATUS OPTIONS
// ============================================

export const CUSTOMER_STATUSES = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  lead: { label: 'Lead', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
} as const;

export const LEAD_STATUSES = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  contacted: { label: 'Contacted', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  qualified: { label: 'Qualified', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  proposal: { label: 'Proposal', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  negotiation: { label: 'Negotiation', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  won: { label: 'Won', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
} as const;

export const CONVERSATION_STATUSES = {
  open: { label: 'Open', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
} as const;

export const APPOINTMENT_STATUSES = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  no_show: { label: 'No Show', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
} as const;

export const TASK_STATUSES = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
} as const;

export const CAMPAIGN_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  running: { label: 'Running', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
} as const;

// ============================================
// PRIORITY LEVELS
// ============================================

export const PRIORITY_LEVELS = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', order: 1 },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', order: 2 },
  high: { label: 'High', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', order: 3 },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', order: 4 },
} as const;

export type PriorityLevel = keyof typeof PRIORITY_LEVELS;

// ============================================
// CHANNEL CONFIGURATION
// ============================================

export interface ChannelConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
}

export const CHANNELS: Record<string, ChannelConfig> = {
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'WhatsApp Business messaging',
  },
  email: {
    id: 'email',
    label: 'Email',
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Email communication',
  },
  voice: {
    id: 'voice',
    label: 'Voice',
    icon: Phone,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'AI-powered voice calls',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    description: 'Instagram Direct messages',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Facebook Messenger',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-800',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'LinkedIn messaging',
  },
  web: {
    id: 'web',
    label: 'Web Chat',
    icon: Globe,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    description: 'Website chat widget',
  },
} as const;

export type ChannelType = keyof typeof CHANNELS;

export function getChannelConfig(channel: string): ChannelConfig {
  return CHANNELS[channel] || CHANNELS.web;
}

// ============================================
// INDUSTRY OPTIONS
// ============================================

export const INDUSTRIES = {
  healthcare: { label: 'Healthcare', icon: '🏥' },
  real_estate: { label: 'Real Estate', icon: '🏠' },
  restaurant: { label: 'Restaurant', icon: '🍽️' },
  salon: { label: 'Salon & Spa', icon: '💇' },
  general: { label: 'General Business', icon: '🏢' },
  fitness: { label: 'Fitness & Wellness', icon: '💪' },
  education: { label: 'Education', icon: '📚' },
  retail: { label: 'Retail', icon: '🛍️' },
  automotive: { label: 'Automotive', icon: '🚗' },
  legal: { label: 'Legal Services', icon: '⚖️' },
  finance: { label: 'Financial Services', icon: '💰' },
  consulting: { label: 'Consulting', icon: '📊' },
} as const;

export type IndustryType = keyof typeof INDUSTRIES;

// ============================================
// LEAD SOURCES
// ============================================

export const LEAD_SOURCES = {
  website: { label: 'Website', color: 'bg-blue-100 text-blue-800' },
  referral: { label: 'Referral', color: 'bg-green-100 text-green-800' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-800' },
  instagram: { label: 'Instagram', color: 'bg-pink-100 text-pink-800' },
  facebook: { label: 'Facebook', color: 'bg-blue-100 text-blue-800' },
  google: { label: 'Google Ads', color: 'bg-red-100 text-red-800' },
  cold_call: { label: 'Cold Call', color: 'bg-gray-100 text-gray-800' },
  cold_email: { label: 'Cold Email', color: 'bg-amber-100 text-amber-800' },
  event: { label: 'Event', color: 'bg-purple-100 text-purple-800' },
  partner: { label: 'Partner', color: 'bg-indigo-100 text-indigo-800' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
} as const;

export type LeadSource = keyof typeof LEAD_SOURCES;

// ============================================
// TIME CONSTANTS
// ============================================

export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'UTC', label: 'UTC' },
] as const;

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { value: 'SAR', label: 'Saudi Riyal', symbol: '﷼' },
] as const;

export const WEEKDAYS = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' },
] as const;

// ============================================
// SUBSCRIPTION PLANS
// ============================================

export const SUBSCRIPTION_PLANS = {
  starter: {
    label: 'Starter',
    price: 99,
    messages: 2000,
    calls: 100,
    users: 3,
    features: ['whatsapp', 'email'],
  },
  professional: {
    label: 'Professional',
    price: 299,
    messages: 10000,
    calls: 500,
    users: 10,
    features: ['whatsapp', 'email', 'voice', 'instagram'],
  },
  enterprise: {
    label: 'Enterprise',
    price: 699,
    messages: 50000,
    calls: 2000,
    users: -1, // unlimited
    features: ['whatsapp', 'email', 'voice', 'instagram', 'facebook', 'linkedin'],
  },
} as const;

// ============================================
// USER ROLES
// ============================================

export const USER_ROLES = {
  master_admin: { label: 'Master Admin', description: 'Full system access across all tenants' },
  admin: { label: 'Admin', description: 'Full access to tenant settings and data' },
  manager: { label: 'Manager', description: 'Team management and reporting' },
  staff: { label: 'Staff', description: 'Standard user access' },
} as const;

export type UserRole = keyof typeof USER_ROLES;

// ============================================
// NOTIFICATION TYPES
// ============================================

export const NOTIFICATION_TYPES = {
  info: { label: 'Info', color: 'bg-blue-100 text-blue-800' },
  success: { label: 'Success', color: 'bg-green-100 text-green-800' },
  warning: { label: 'Warning', color: 'bg-amber-100 text-amber-800' },
  error: { label: 'Error', color: 'bg-red-100 text-red-800' },
} as const;

export const NOTIFICATION_CATEGORIES = {
  system: { label: 'System', icon: '⚙️' },
  message: { label: 'Message', icon: '💬' },
  appointment: { label: 'Appointment', icon: '📅' },
  task: { label: 'Task', icon: '✅' },
  deal: { label: 'Deal', icon: '💰' },
  lead: { label: 'Lead', icon: '👤' },
  campaign: { label: 'Campaign', icon: '📣' },
} as const;

// ============================================
// AI TONES
// ============================================

export const AI_TONES = {
  professional: { label: 'Professional', description: 'Formal and business-like' },
  casual: { label: 'Casual', description: 'Relaxed and conversational' },
  friendly: { label: 'Friendly', description: 'Warm and approachable' },
  formal: { label: 'Formal', description: 'Very proper and structured' },
} as const;

export type AITone = keyof typeof AI_TONES;

// ============================================
// LANGUAGE OPTIONS
// ============================================

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'hi', label: 'Hindi' },
  { value: 'nl', label: 'Dutch' },
] as const;
