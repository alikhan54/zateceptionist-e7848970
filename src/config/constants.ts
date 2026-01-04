// Application constants and configuration

export const APP_NAME = 'Zateceptionist';
export const APP_VERSION = '1.0.0';

export const N8N_WEBHOOK_BASE = 'https://webhooks.zatesystems.com/webhook';

// Webhook endpoints
export const WEBHOOKS = {
  // Sales
  LEAD_GEN_REQUEST: 'lead-gen-request',
  INTENT_LEAD_GEN: 'intent-lead-gen',
  DEAL_CREATE: 'deal-create',
  DEAL_UPDATE: 'deal-update',
  LEAD_CONTROL: 'lead-control',
  AUTOMATION_CONTROL: 'automation-control',
  
  // Marketing
  SEND_CAMPAIGN: 'marketing/send-campaign',
  GENERATE_CONTENT: 'marketing/generate-content',
  
  // HR
  EMPLOYEE_ONBOARDING: 'hr/employee-onboarding',
  ATTENDANCE_CHECK_IN: 'hr/attendance/check-in',
  ATTENDANCE_CHECK_OUT: 'hr/attendance/check-out',
  LEAVE_REQUEST: 'hr/leave/request',
  LEAVE_APPROVE: 'hr/leave/approve',
  
  // Main/Operations
  SEND_MESSAGE: 'send-message',
  BOOK_APPOINTMENT: 'book-appointment',
  CUSTOMER_UPDATE: 'customer-update',
} as const;

// Channel configurations
export const CHANNELS = {
  whatsapp: { label: 'WhatsApp', color: 'hsl(142, 70%, 45%)' },
  email: { label: 'Email', color: 'hsl(217, 91%, 60%)' },
  instagram: { label: 'Instagram', color: 'hsl(340, 82%, 52%)' },
  facebook: { label: 'Facebook', color: 'hsl(221, 44%, 41%)' },
  sms: { label: 'SMS', color: 'hsl(262, 83%, 58%)' },
} as const;

// Lead stages for pipeline
export const LEAD_STAGES = [
  { id: 'new', label: 'New', color: 'hsl(var(--muted))' },
  { id: 'contacted', label: 'Contacted', color: 'hsl(217, 91%, 60%)' },
  { id: 'qualified', label: 'Qualified', color: 'hsl(262, 83%, 58%)' },
  { id: 'proposal', label: 'Proposal', color: 'hsl(45, 93%, 47%)' },
  { id: 'negotiation', label: 'Negotiation', color: 'hsl(25, 95%, 53%)' },
  { id: 'won', label: 'Won', color: 'hsl(142, 71%, 45%)' },
  { id: 'lost', label: 'Lost', color: 'hsl(0, 84%, 60%)' },
] as const;

// Appointment statuses
export const APPOINTMENT_STATUSES = [
  { id: 'scheduled', label: 'Scheduled', color: 'hsl(217, 91%, 60%)' },
  { id: 'confirmed', label: 'Confirmed', color: 'hsl(142, 71%, 45%)' },
  { id: 'completed', label: 'Completed', color: 'hsl(var(--muted))' },
  { id: 'cancelled', label: 'Cancelled', color: 'hsl(0, 84%, 60%)' },
  { id: 'no_show', label: 'No Show', color: 'hsl(25, 95%, 53%)' },
] as const;
