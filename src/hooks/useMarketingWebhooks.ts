import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import { useToast } from '@/hooks/use-toast';

// Types
export interface GenerateContentRequest {
  type: 'social' | 'email' | 'blog' | 'whatsapp' | 'ad';
  topic: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'humorous';
  language?: string;
  reference_url?: string;
  keywords?: string[];
  length?: 'short' | 'medium' | 'long';
  platform?: string;
}

export interface GeneratedContent {
  id: string;
  content: string;
  type: string;
  variations?: string[];
  hashtags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GenerateImageRequest {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'minimal' | 'bold';
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:5';
  brand_colors?: string[];
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  metadata?: Record<string, unknown>;
}

export interface SendCampaignRequest {
  campaign_id: string;
  audience_ids?: string[];
  schedule_at?: string;
  test_mode?: boolean;
}

export interface PostSocialRequest {
  platforms: ('instagram' | 'facebook' | 'linkedin' | 'twitter')[];
  content: string;
  media_urls?: string[];
  hashtags?: string[];
  schedule_at?: string;
}

export interface SchedulePostRequest {
  platform: string;
  content: string;
  media_urls?: string[];
  scheduled_at: string;
  timezone?: string;
}

export function useMarketingWebhooks() {
  const { tenantId: tid } = useTenant();
  const tenantId = tid || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generate AI Content
  const generateContent = useMutation({
    mutationFn: async (data: GenerateContentRequest) => {
      const result = await callWebhook<GeneratedContent>(WEBHOOKS.GENERATE_CONTENT, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: 'Content Generated',
        description: 'AI content has been generated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate AI Image
  const generateImage = useMutation({
    mutationFn: async (data: GenerateImageRequest) => {
      const result = await callWebhook<GeneratedImage>(WEBHOOKS.GENERATE_IMAGE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: 'Image Generated',
        description: 'AI image has been generated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Image Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send Campaign
  const sendCampaign = useMutation({
    mutationFn: async (data: SendCampaignRequest) => {
      const result = await callWebhook<{ sent: number; campaign_id: string }>(WEBHOOKS.SEND_CAMPAIGN, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
      toast({
        title: 'Campaign Sent',
        description: `Campaign sent to ${data?.sent || 0} recipients`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Campaign Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Post to Social Media
  const postSocial = useMutation({
    mutationFn: async (data: PostSocialRequest) => {
      const result = await callWebhook<{ posted: string[]; failed: string[] }>(WEBHOOKS.POST_SOCIAL, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts', tenantId] });
      const postedCount = data?.posted?.length || 0;
      toast({
        title: 'Posted Successfully',
        description: `Published to ${postedCount} platform${postedCount !== 1 ? 's' : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Post Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Schedule Social Post
  const schedulePost = useMutation({
    mutationFn: async (data: SchedulePostRequest) => {
      const result = await callWebhook<{ scheduled_id: string; scheduled_at: string }>(WEBHOOKS.SCHEDULE_POST, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts', tenantId] });
      toast({
        title: 'Post Scheduled',
        description: 'Your post has been scheduled successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Scheduling Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    generateContent,
    generateImage,
    sendCampaign,
    postSocial,
    schedulePost,
  };
}
