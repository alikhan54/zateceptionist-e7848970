import { supabase } from "@/integrations/supabase/client";

const COLORS: Record<string, string> = {
  social_post: "#3b82f6",
  email_campaign: "#22c55e",
  blog_post: "#a855f7",
  video: "#ef4444",
  ad: "#f97316",
  sequence: "#06b6d4",
};

export async function syncToCalendar(params: {
  tenantId: string;
  title: string;
  contentType: string;
  status: "planned" | "scheduled" | "published";
  scheduledAt?: string;
  publishedAt?: string;
  platform?: string;
  contentId?: string;
  contentPreview?: string;
}) {
  try {
    await supabase.from("marketing_calendar" as any).insert({
      tenant_id: params.tenantId,
      title: params.title,
      content_type: params.contentType,
      status: params.status,
      scheduled_at: params.scheduledAt || params.publishedAt || new Date().toISOString(),
      published_at: params.publishedAt,
      platform: params.platform,
      content_id: params.contentId,
      content_preview: params.contentPreview?.substring(0, 200),
      color: COLORS[params.contentType] || "#6366f1",
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.log("Calendar sync failed:", err);
  }
}
