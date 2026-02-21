import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLandingPages } from "@/hooks/useLandingPages";
import {
  Globe,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Layout,
  Smartphone,
  Monitor,
  MousePointer,
  BarChart3,
  TrendingUp,
  ExternalLink,
  Check,
  X,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function injectFormAction(html: string, tenantId: string, pageId: string): string {
  if (!html) return html;
  const webhookUrl = `https://webhooks.zatesystems.com/webhook/marketing/landing-page-submit`;
  return html.replace(
    /<form([^>]*)>/gi,
    `<form$1 action="${webhookUrl}" method="POST"><input type="hidden" name="tenant_id" value="${tenantId}"><input type="hidden" name="page_id" value="${pageId}">`
  );
}

const mockTemplates = [
  {
    id: "t1",
    name: "Lead Generation",
    category: "Lead Gen",
    description: "Capture leads with a clean, high-converting form",
  },
  { id: "t2", name: "Product Launch", category: "Product", description: "Showcase your new product with impact" },
  {
    id: "t3",
    name: "Webinar Registration",
    category: "Events",
    description: "Drive registrations for your online events",
  },
  {
    id: "t4",
    name: "E-book Download",
    category: "Lead Gen",
    description: "Offer valuable content in exchange for contact info",
  },
  { id: "t5", name: "Coming Soon", category: "Launch", description: "Build anticipation for your upcoming launch" },
  {
    id: "t6",
    name: "Thank You Page",
    category: "Post-Conversion",
    description: "Engage customers after form submission",
  },
];

export default function LandingPages() {
  const { toast } = useToast();
  const { pages, isLoading, stats, createPage, publishPage, deletePage } = useLandingPages();
  const { tenantConfig } = useTenant();

  const [activeTab, setActiveTab] = useState("pages");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [newPageName, setNewPageName] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  // FIX: Added preview modal state
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewPageName, setPreviewPageName] = useState("");

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      archived: { variant: "destructive", label: "Archived" },
    };
    const { variant, label } = config[status] || config.draft;
    return <Badge variant={variant}>{label}</Badge>;
  };

  // FIX: Enhanced handleCreatePage with AI generation via webhook
  const handleCreatePage = async () => {
    if (!newPageName.trim()) {
      toast({ title: "Error", description: "Please enter a page name", variant: "destructive" });
      return;
    }
    try {
      let htmlContent = "";
      // Try AI generation via webhook
      if (tenantConfig?.id) {
        try {
          const result = await callWebhook(
            WEBHOOKS.LANDING_PAGE_GENERATE || "/marketing/landing-page-generate",
            {
              goal: selectedTemplate?.category?.toLowerCase() || "lead_capture",
              industry: tenantConfig?.industry || "technology",
              company_name: tenantConfig?.company_name || "Your Company",
              brand_color: "#3b82f6",
              headline: newPageName,
            },
            tenantConfig.id,
          );
          if (result.success && (result.data as any)?.html_content) {
            htmlContent = (result.data as any).html_content;
          }
        } catch (e) {
          console.log("AI page gen unavailable, using default template");
        }
      }
      const fallbackHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${newPageName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;line-height:1.6}
.hero{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:80px 20px;text-align:center}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);margin-bottom:16px;font-weight:800}
.hero p{font-size:18px;opacity:0.9;max-width:600px;margin:0 auto 32px}
.cta-btn{display:inline-block;background:white;color:#6366f1;padding:16px 40px;border-radius:50px;text-decoration:none;font-weight:700;font-size:18px;box-shadow:0 4px 15px rgba(0,0,0,0.2);transition:transform 0.2s}
.cta-btn:hover{transform:translateY(-2px)}
.features{max-width:1000px;margin:0 auto;padding:60px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:30px}
.feature{text-align:center;padding:30px}
.feature .icon{width:60px;height:60px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px}
.feature h3{font-size:20px;margin-bottom:8px}
.feature p{color:#666;font-size:15px}
.social-proof{background:#f8f9fa;padding:60px 20px;text-align:center}
.social-proof h2{font-size:28px;margin-bottom:30px}
.stats{display:flex;justify-content:center;gap:60px;flex-wrap:wrap}
.stat{text-align:center}.stat .number{font-size:36px;font-weight:800;color:#6366f1}.stat .label{color:#666;font-size:14px}
.cta-section{padding:60px 20px;text-align:center;background:linear-gradient(135deg,#1a1a2e,#2d2d44);color:white}
.cta-section h2{font-size:28px;margin-bottom:16px}
footer{padding:20px;text-align:center;color:#888;font-size:13px}
</style></head>
<body>
<section class="hero">
<h1>${newPageName}</h1>
<p>Transform your business with our cutting-edge solutions. Join thousands of satisfied customers.</p>
<a href="#" class="cta-btn">Get Started Free →</a>
</section>
<section class="features">
<div class="feature"><div class="icon">⚡</div><h3>Lightning Fast</h3><p>Get up and running in minutes, not days.</p></div>
<div class="feature"><div class="icon">🤖</div><h3>AI-Powered</h3><p>Smart automation that works 24/7 for you.</p></div>
<div class="feature"><div class="icon">📊</div><h3>Real Analytics</h3><p>Track every metric that matters to your business.</p></div>
</section>
<section class="social-proof">
<h2>Trusted by Growing Businesses</h2>
<div class="stats">
<div class="stat"><div class="number">500+</div><div class="label">Happy Customers</div></div>
<div class="stat"><div class="number">99.9%</div><div class="label">Uptime</div></div>
<div class="stat"><div class="number">4.9★</div><div class="label">Average Rating</div></div>
</div>
</section>
<section class="cta-section">
<h2>Ready to Transform Your Business?</h2>
<p>Start your free trial today. No credit card required.</p>
<a href="#" class="cta-btn" style="background:white;color:#6366f1">Start Free Trial →</a>
</section>
<footer>© ${new Date().getFullYear()} ${tenantConfig?.company_name || 'Your Company'}. All rights reserved.</footer>
</body></html>`;

      await createPage.mutateAsync({
        name: newPageName,
        template: selectedTemplate?.name,
        html_content: htmlContent || fallbackHtml,
      });
      setIsCreateOpen(false);
      setNewPageName("");
      setSelectedTemplate(null);
    } catch {}
  };

  const handlePublish = async (page: any) => {
    try {
      await publishPage.mutateAsync(page.id);
    } catch {}
  };

  const handleDelete = async (pageId: string) => {
    try {
      await deletePage.mutateAsync(pageId);
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const avgCvr =
    pages.length > 0
      ? (
          pages.reduce((sum: number, p: any) => sum + (p.conversion_rate || 0), 0) /
          (pages.filter((p: any) => p.status === "published").length || 1)
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground mt-1">Create high-converting landing pages</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Pages", value: stats.total, icon: Globe },
          { label: "Published", value: stats.published, icon: Check },
          { label: "Total Views", value: stats.totalViews.toLocaleString(), icon: Eye },
          { label: "Conversions", value: stats.totalConversions.toLocaleString(), icon: MousePointer },
          { label: "Avg. CVR", value: `${avgCvr}%`, icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pages">My Pages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-6">
          {pages.length === 0 ? (
            <Card className="p-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No landing pages yet</p>
              <p className="text-muted-foreground mb-4">Create your first landing page</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Page
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page: any) => (
                <Card key={page.id} className="overflow-hidden">
                  <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                    <Layout className="h-12 w-12 text-primary/40" />
                    <div className="absolute top-2 right-2">{getStatusBadge(page.status)}</div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{page.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {format(new Date(page.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* FIX: Preview button that opens inline modal instead of broken SSL link */}
                          <DropdownMenuItem
                            onClick={() => {
                              const injected = injectFormAction(page.html_content || "<p>No content yet</p>", tenantConfig?.id || '', page.id);
                              setPreviewHtml(injected);
                              setPreviewPageName(page.name);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          {page.status === "draft" && (
                            <DropdownMenuItem onClick={() => handlePublish(page)}>
                              <Check className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText("https://webhooks.zatesystems.com/webhook/marketing/landing-page-submit");
                              toast({ title: "Form Webhook URL Copied!", description: "Form submissions from this page will automatically create leads in your CRM" });
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Form Webhook URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(page.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {page.status === "published" && (
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-lg font-bold">{(page.views || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{(page.conversions || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Conversions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-500">{page.conversion_rate || 0}%</p>
                          <p className="text-xs text-muted-foreground">CVR</p>
                        </div>
                      </div>
                    )}
                    {page.status === "draft" && (
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button className="flex-1" onClick={() => handlePublish(page)}>
                          Publish
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  setSelectedTemplate(template);
                  setIsCreateOpen(true);
                }}
              >
                <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Layout className="h-12 w-12 text-primary/40" />
                </div>
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2">
                    {template.category}
                  </Badge>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Page Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Landing Page</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? `Starting with ${selectedTemplate.name} template`
                : "Start from scratch or choose a template"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Page Name</Label>
              <Input
                placeholder="My Landing Page"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setSelectedTemplate(null);
                setNewPageName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePage} disabled={createPage.isPending}>
              {createPage.isPending ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIX: Inline Preview Modal - replaces broken SSL external link */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Preview: {previewPageName}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={previewMode === "desktop" ? "default" : "outline"}
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === "mobile" ? "default" : "outline"}
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(previewHtml || "");
                    toast({ title: "HTML Copied to Clipboard!" });
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy HTML
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            <iframe
              srcDoc={previewHtml || ""}
              className="w-full h-full border-0"
              style={{
                maxWidth: previewMode === "mobile" ? "375px" : "100%",
                margin: "0 auto",
                display: "block",
                minHeight: "500px",
              }}
              title="Landing Page Preview"
              sandbox="allow-scripts"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
