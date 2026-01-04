import { callWebhook, WEBHOOKS } from '@/integrations/supabase/client';

// ============================================
// SALES WEBHOOKS
// ============================================

/**
 * Start an automated sequence for a lead
 */
export async function startLeadSequence(tenantId: string, leadId: string, sequenceId?: string) {
  return callWebhook(
    WEBHOOKS.LEAD_CONTROL,
    { lead_id: leadId, action: 'start', sequence_id: sequenceId },
    tenantId
  );
}

/**
 * Pause an active lead sequence
 */
export async function pauseLeadSequence(tenantId: string, leadId: string, reason?: string) {
  return callWebhook(
    WEBHOOKS.LEAD_CONTROL,
    { lead_id: leadId, action: 'pause', reason },
    tenantId
  );
}

/**
 * Resume a paused lead sequence
 */
export async function resumeLeadSequence(tenantId: string, leadId: string) {
  return callWebhook(
    WEBHOOKS.LEAD_CONTROL,
    { lead_id: leadId, action: 'resume' },
    tenantId
  );
}

/**
 * Stop a lead sequence completely
 */
export async function stopLeadSequence(tenantId: string, leadId: string, reason?: string) {
  return callWebhook(
    WEBHOOKS.LEAD_CONTROL,
    { lead_id: leadId, action: 'stop', reason },
    tenantId
  );
}

/**
 * Skip to next step in sequence
 */
export async function skipSequenceStep(tenantId: string, leadId: string) {
  return callWebhook(
    WEBHOOKS.LEAD_CONTROL,
    { lead_id: leadId, action: 'skip' },
    tenantId
  );
}

// ============================================
// AUTOMATION CONTROL
// ============================================

/**
 * Switch between AI and human handler for an entity
 */
export async function switchHandler(
  tenantId: string,
  entityId: string,
  entityType: 'conversation' | 'lead' | 'customer',
  handler: 'ai' | 'human',
  reason?: string
) {
  return callWebhook(
    WEBHOOKS.AUTOMATION_CONTROL,
    {
      entity_id: entityId,
      entity_type: entityType,
      handler,
      reason,
    },
    tenantId
  );
}

/**
 * Trigger AI takeover for a conversation
 */
export async function triggerAITakeover(tenantId: string, conversationId: string) {
  return switchHandler(tenantId, conversationId, 'conversation', 'ai');
}

/**
 * Trigger human takeover for a conversation
 */
export async function triggerHumanTakeover(tenantId: string, conversationId: string, reason?: string) {
  return switchHandler(tenantId, conversationId, 'conversation', 'human', reason);
}

// ============================================
// LEAD GENERATION
// ============================================

export interface B2BLeadGenParams {
  industry: string;
  keywords: string;
  location: string;
  count: number;
  company_size?: string;
  job_titles?: string[];
}

/**
 * Generate B2B leads using Apollo/Apify
 */
export async function generateB2BLeads(tenantId: string, params: B2BLeadGenParams) {
  return callWebhook(WEBHOOKS.LEAD_GEN_B2B, params as unknown as Record<string, unknown>, tenantId);
}

export interface B2CLeadGenParams {
  intent_keywords: string;
  platforms: string[];
  location?: string;
  count?: number;
}

/**
 * Generate B2C leads based on intent signals
 */
export async function generateB2CLeads(tenantId: string, params: B2CLeadGenParams) {
  return callWebhook(WEBHOOKS.LEAD_GEN_B2C, params as unknown as Record<string, unknown>, tenantId);
}

/**
 * Upload leads from CSV/file
 */
export async function uploadLeads(
  tenantId: string,
  leads: Array<{ name: string; email?: string; phone?: string; company?: string }>,
  source: string
) {
  return callWebhook(
    WEBHOOKS.LEAD_UPLOAD,
    { leads, source, count: leads.length },
    tenantId
  );
}

// ============================================
// MESSAGING
// ============================================

export interface SendMessageParams {
  customer_id?: string;
  customer_phone?: string;
  customer_email?: string;
  message: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'instagram' | 'facebook' | 'linkedin';
  template_id?: string;
  variables?: Record<string, string>;
  schedule_at?: string;
}

/**
 * Send a message via any channel
 */
export async function sendMessage(tenantId: string, params: SendMessageParams) {
  return callWebhook(WEBHOOKS.SEND_MESSAGE, params as unknown as Record<string, unknown>, tenantId);
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
  tenantId: string,
  phone: string,
  message: string,
  templateId?: string
) {
  return sendMessage(tenantId, {
    customer_phone: phone,
    message,
    channel: 'whatsapp',
    template_id: templateId,
  });
}

/**
 * Send email
 */
export async function sendEmail(
  tenantId: string,
  email: string,
  subject: string,
  body: string,
  templateId?: string
) {
  return sendMessage(tenantId, {
    customer_email: email,
    message: body,
    channel: 'email',
    template_id: templateId,
    variables: { subject },
  });
}

// ============================================
// APPOINTMENTS
// ============================================

export interface BookAppointmentParams {
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type?: string;
  assigned_to?: string;
  location?: string;
  send_confirmation?: boolean;
  send_reminder?: boolean;
}

/**
 * Book an appointment and optionally send notifications
 */
export async function bookAppointment(tenantId: string, params: BookAppointmentParams) {
  return callWebhook(WEBHOOKS.BOOK_APPOINTMENT, params as unknown as Record<string, unknown>, tenantId);
}

/**
 * Reschedule an existing appointment
 */
export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  newStartTime: string,
  newEndTime: string,
  notifyCustomer: boolean = true
) {
  return callWebhook(
    WEBHOOKS.BOOK_APPOINTMENT,
    {
      action: 'reschedule',
      appointment_id: appointmentId,
      start_time: newStartTime,
      end_time: newEndTime,
      notify_customer: notifyCustomer,
    },
    tenantId
  );
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  tenantId: string,
  appointmentId: string,
  reason?: string,
  notifyCustomer: boolean = true
) {
  return callWebhook(
    WEBHOOKS.BOOK_APPOINTMENT,
    {
      action: 'cancel',
      appointment_id: appointmentId,
      reason,
      notify_customer: notifyCustomer,
    },
    tenantId
  );
}

/**
 * Send appointment reminder
 */
export async function sendAppointmentReminder(tenantId: string, appointmentId: string) {
  return callWebhook(
    WEBHOOKS.BOOK_APPOINTMENT,
    { action: 'remind', appointment_id: appointmentId },
    tenantId
  );
}

// ============================================
// DEALS
// ============================================

export interface CreateDealParams {
  name: string;
  customer_id?: string;
  customer_name?: string;
  value: number;
  currency?: string;
  stage: string;
  probability?: number;
  expected_close_date?: string;
  assigned_to?: string;
  source?: string;
  notes?: string;
}

/**
 * Create a new deal
 */
export async function createDeal(tenantId: string, params: CreateDealParams) {
  return callWebhook(WEBHOOKS.DEAL_CREATE, params as unknown as Record<string, unknown>, tenantId);
}

/**
 * Update deal stage
 */
export async function updateDealStage(
  tenantId: string,
  dealId: string,
  stage: string,
  probability?: number
) {
  return callWebhook(
    WEBHOOKS.DEAL_UPDATE,
    { deal_id: dealId, stage, probability },
    tenantId
  );
}

/**
 * Mark deal as won
 */
export async function markDealWon(tenantId: string, dealId: string, reason?: string) {
  return callWebhook(
    WEBHOOKS.DEAL_UPDATE,
    { deal_id: dealId, action: 'won', reason },
    tenantId
  );
}

/**
 * Mark deal as lost
 */
export async function markDealLost(tenantId: string, dealId: string, reason?: string) {
  return callWebhook(
    WEBHOOKS.DEAL_UPDATE,
    { deal_id: dealId, action: 'lost', reason },
    tenantId
  );
}

// ============================================
// MARKETING CAMPAIGNS
// ============================================

/**
 * Send/execute a campaign
 */
export async function sendCampaign(tenantId: string, campaignId: string) {
  return callWebhook(
    WEBHOOKS.SEND_CAMPAIGN,
    { campaign_id: campaignId, action: 'send' },
    tenantId
  );
}

/**
 * Schedule a campaign
 */
export async function scheduleCampaign(tenantId: string, campaignId: string, scheduledAt: string) {
  return callWebhook(
    WEBHOOKS.SEND_CAMPAIGN,
    { campaign_id: campaignId, action: 'schedule', scheduled_at: scheduledAt },
    tenantId
  );
}

/**
 * Pause a running campaign
 */
export async function pauseCampaign(tenantId: string, campaignId: string) {
  return callWebhook(
    WEBHOOKS.SEND_CAMPAIGN,
    { campaign_id: campaignId, action: 'pause' },
    tenantId
  );
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(tenantId: string, campaignId: string) {
  return callWebhook(
    WEBHOOKS.SEND_CAMPAIGN,
    { campaign_id: campaignId, action: 'resume' },
    tenantId
  );
}

// ============================================
// CONTENT GENERATION
// ============================================

export interface GenerateContentParams {
  type: 'email' | 'whatsapp' | 'social' | 'sms';
  prompt: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
  language?: string;
  max_length?: number;
  context?: Record<string, unknown>;
}

/**
 * Generate content using AI
 */
export async function generateContent(tenantId: string, params: GenerateContentParams) {
  return callWebhook(WEBHOOKS.GENERATE_CONTENT, params as unknown as Record<string, unknown>, tenantId);
}

/**
 * Generate email content
 */
export async function generateEmailContent(
  tenantId: string,
  prompt: string,
  tone: GenerateContentParams['tone'] = 'professional'
) {
  return generateContent(tenantId, { type: 'email', prompt, tone });
}

/**
 * Generate WhatsApp message
 */
export async function generateWhatsAppContent(
  tenantId: string,
  prompt: string,
  tone: GenerateContentParams['tone'] = 'friendly'
) {
  return generateContent(tenantId, { type: 'whatsapp', prompt, tone, max_length: 1000 });
}

/**
 * Generate social media post
 */
export async function generateSocialContent(
  tenantId: string,
  prompt: string,
  platform?: string
) {
  return generateContent(tenantId, {
    type: 'social',
    prompt,
    tone: 'casual',
    context: platform ? { platform } : undefined,
  });
}
