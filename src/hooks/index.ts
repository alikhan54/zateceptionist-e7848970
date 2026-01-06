// Core hooks
export { useWebhook, useWebhookMutation } from './useWebhook';

// Module-specific webhook hooks
export { useSalesWebhooks } from './useSalesWebhooks';
export { useMarketingWebhooks } from './useMarketingWebhooks';
export { useHRWebhooks } from './useHRWebhooks';
export { useCommunicationsWebhooks } from './useCommunicationsWebhooks';
export { useAnalyticsWebhooks } from './useAnalyticsWebhooks';

// Data hooks
export { useIsMobile } from './use-mobile';
export { useToast } from './use-toast';

// Re-export types
export type {
  Lead,
  Deal,
  B2BLeadGenRequest,
  B2CLeadGenRequest,
} from './useSalesWebhooks';

export type {
  GenerateContentRequest,
  GeneratedContent,
  GenerateImageRequest,
  GeneratedImage,
  SendCampaignRequest,
  PostSocialRequest,
  SchedulePostRequest,
} from './useMarketingWebhooks';

export type {
  Employee,
  OnboardingRequest,
  AttendanceRecord,
  LeaveRequest,
  LeaveApproval,
  HRDashboardData,
  AIAssistantRequest,
} from './useHRWebhooks';

export type {
  SendMessageRequest,
  BookAppointmentRequest,
  CustomerUpdateRequest,
  VAPIOutboundRequest,
  VAPIConfigRequest,
} from './useCommunicationsWebhooks';

export type {
  AnalyticsData,
  RealtimeData,
  AnalyticsFilters,
} from './useAnalyticsWebhooks';
