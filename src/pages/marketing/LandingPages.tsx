import { useState, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { logSystemEvent } from "@/lib/api/systemEvents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLandingPages } from "@/hooks/useLandingPages";
import { useNavigate } from "react-router-dom";
import {
  Globe, Plus, Eye, Trash2, Copy, MoreVertical, Layout, Smartphone, Monitor,
  MousePointer, TrendingUp, Check, Download, Edit, ExternalLink, Info,
  UserPlus, Rocket, CalendarDays, Clock, Zap, MessageSquare,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

// ─── Form action injector ───
function injectFormAction(html: string, tenantId: string, pageId: string): string {
  if (!html) return html;
  const webhookUrl = `https://webhooks.zatesystems.com/webhook/marketing/landing-page-submit`;
  return html.replace(
    /<form([^>]*)>/gi,
    `<form$1 action="${webhookUrl}" method="POST"><input type="hidden" name="tenant_id" value="${tenantId}"><input type="hidden" name="page_id" value="${pageId}">`
  );
}

// ─── Template definitions ───
const pageTemplates = [
  { id: "lead_capture", name: "Lead Capture", icon: UserPlus, color: "bg-blue-500/10 text-blue-500", desc: "Capture leads with a clean, high-converting form" },
  { id: "product_launch", name: "Product Launch", icon: Rocket, color: "bg-purple-500/10 text-purple-500", desc: "Showcase your new product with impact" },
  { id: "event_registration", name: "Event Registration", icon: CalendarDays, color: "bg-green-500/10 text-green-500", desc: "Drive registrations for events and webinars" },
  { id: "coming_soon", name: "Coming Soon", icon: Clock, color: "bg-amber-500/10 text-amber-500", desc: "Build anticipation for your upcoming launch" },
  { id: "free_trial", name: "Free Trial", icon: Zap, color: "bg-primary/10 text-primary", desc: "Convert visitors into trial users" },
  { id: "contact_us", name: "Contact Us", icon: MessageSquare, color: "bg-pink-500/10 text-pink-500", desc: "Simple contact form for inquiries" },
];

const formFieldOptions = [
  { key: "name", label: "Name", default: true },
  { key: "email", label: "Email", default: true },
  { key: "phone", label: "Phone", default: false },
  { key: "company", label: "Company", default: false },
  { key: "message", label: "Message", default: false },
];

// ─── HTML generator ───
function generatePageHtml(config: {
  title: string; subtitle: string; heroImage: string; bodyContent: string;
  ctaText: string; ctaColor: string; formFields: string[]; thankYouMessage: string;
  companyName: string; tenantId: string; pageId: string;
}): string {
  const formFieldsHtml = config.formFields.map(f => {
    if (f === 'message') return `<textarea name="message" placeholder="Your message..." rows="4" style="width:100%;padding:12px 16px;border:1px solid #ddd;border-radius:8px;font-size:15px;resize:vertical;" required></textarea>`;
    const types: Record<string, string> = { email: 'email', phone: 'tel' };
    return `<input type="${types[f] || 'text'}" name="${f}" placeholder="Your ${f}" style="width:100%;padding:12px 16px;border:1px solid #ddd;border-radius:8px;font-size:15px;" required />`;
  }).join('\n');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;line-height:1.6}
.hero{background:linear-gradient(135deg,${config.ctaColor}dd,${config.ctaColor}88);color:white;padding:80px 20px;text-align:center}
${config.heroImage ? `.hero{background:linear-gradient(135deg,${config.ctaColor}cc,${config.ctaColor}66),url('${config.heroImage}') center/cover}` : ''}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);margin-bottom:16px;font-weight:800}
.hero p{font-size:18px;opacity:0.9;max-width:600px;margin:0 auto}
.content{max-width:800px;margin:0 auto;padding:60px 20px}
.content p,.content li{font-size:16px;line-height:1.8;color:#444}
.form-section{max-width:500px;margin:40px auto;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.form-section h2{font-size:24px;margin-bottom:20px;text-align:center}
.form-section form{display:flex;flex-direction:column;gap:12px}
.submit-btn{background:${config.ctaColor};color:white;border:none;padding:14px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:opacity 0.2s}
.submit-btn:hover{opacity:0.9}
.thank-you{display:none;text-align:center;padding:40px}
.thank-you h3{color:${config.ctaColor};font-size:24px;margin-bottom:8px}
footer{padding:30px 20px;text-align:center;color:#888;font-size:13px;border-top:1px solid #eee}
</style></head>
<body>
<section class="hero">
<h1>${config.title}</h1>
<p>${config.subtitle}</p>
</section>
${config.bodyContent ? `<section class="content">${config.bodyContent}</section>` : ''}
<section class="form-section" id="form-section">
<h2>${config.ctaText || 'Get Started'}</h2>
<form action="https://webhooks.zatesystems.com/webhook/marketing/landing-page-submit" method="POST">
<input type="hidden" name="tenant_id" value="${config.tenantId}" />
<input type="hidden" name="page_id" value="${config.pageId}" />
${formFieldsHtml}
<button type="submit" class="submit-btn">${config.ctaText || 'Submit'}</button>
</form>
</section>
<div class="thank-you" id="thank-you">
<h3>✓</h3>
<p>${config.thankYouMessage || 'Thank you! We\'ll be in touch soon.'}</p>
</div>
<footer>© ${new Date().getFullYear()} ${config.companyName}. All rights reserved.</footer>
</body></html>`;
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function LandingPages() {
  const { toast } = useToast();
  const { pages, isLoading, stats, createPage, publishPage, deletePage } = useLandingPages();
  const { tenantConfig } = useTenant();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pages");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof pageTemplates[0] | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewPageName, setPreviewPageName] = useState("");

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string>("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorSubtitle, setEditorSubtitle] = useState("");
  const [editorHeroImage, setEditorHeroImage] = useState("");
  const [editorBody, setEditorBody] = useState("");
  const [editorCtaText, setEditorCtaText] = useState("Get Started");
  const [editorCtaColor, setEditorCtaColor] = useState("#6366f1");
  const [editorFormFields, setEditorFormFields] = useState<string[]>(["name", "email"]);
  const [editorThankYou, setEditorThankYou] = useState("Thank you! We'll be in touch soon.");
  const [editorMetaTitle, setEditorMetaTitle] = useState("");
  const [editorMetaDescription, setEditorMetaDescription] = useState("");

  // Live preview HTML
  const editorPreviewHtml = useMemo(() => generatePageHtml({
    title: editorTitle || "Your Page Title",
    subtitle: editorSubtitle || "A compelling subtitle goes here",
    heroImage: editorHeroImage,
    bodyContent: editorBody,
    ctaText: editorCtaText,
    ctaColor: editorCtaColor,
    formFields: editorFormFields,
    thankYouMessage: editorThankYou,
    companyName: tenantConfig?.company_name || "Your Company",
    tenantId: tenantConfig?.id || "",
    pageId: editingPageId || "new",
  }), [editorTitle, editorSubtitle, editorHeroImage, editorBody, editorCtaText, editorCtaColor, editorFormFields, editorThankYou, tenantConfig, editingPageId]);

  const toggleFormField = (key: string) => {
    setEditorFormFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  };

  const openEditor = (template?: typeof pageTemplates[0]) => {
    setEditingPageId("");
    setEditorTitle(template?.name || "");
    setEditorSubtitle(template?.desc || "");
    setEditorHeroImage("");
    setEditorBody("");
    setEditorCtaText(template?.id === "contact_us" ? "Send Message" : template?.id === "event_registration" ? "Register Now" : template?.id === "free_trial" ? "Start Free Trial" : "Get Started");
    setEditorCtaColor("#6366f1");
    setEditorFormFields(template?.id === "contact_us" ? ["name", "email", "message"] : template?.id === "event_registration" ? ["name", "email", "company"] : ["name", "email"]);
    setEditorThankYou("Thank you! We'll be in touch soon.");
    setIsCreateOpen(false);
    setIsEditorOpen(true);
  };

  const handleSavePage = async () => {
    if (!editorTitle.trim()) { toast({ title: "Enter a page title", variant: "destructive" }); return; }
    try {
      await createPage.mutateAsync({
        name: editorTitle,
        template: selectedTemplate?.name,
        html_content: editorPreviewHtml,
        meta_title: editorMetaTitle || editorTitle,
        meta_description: editorMetaDescription || editorSubtitle,
      });
      setIsEditorOpen(false);
      toast({ title: "✅ Page Created!", description: "Your landing page has been saved as draft." });
      logSystemEvent({ tenantId: tenantConfig?.id || '', eventType: 'landing_page_created', sourceModule: 'marketing', eventData: { page_name: editorTitle } });
    } catch {}
  };

  const handleCopyHtml = (html: string) => {
    navigator.clipboard.writeText(html);
    toast({ title: "HTML Copied!" });
  };

  const handleDownloadHtml = (html: string, name: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const webhookUrl = "https://webhooks.zatesystems.com/webhook/marketing/landing-page-submit";

  const avgCvr = pages.length > 0
    ? (pages.reduce((sum: number, p: any) => sum + (p.conversion_rate || 0), 0) / (pages.filter((p: any) => p.status === "published").length || 1)).toFixed(1)
    : "0";

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-5 gap-4">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-96" /></div>;
  }

  // ─── EDITOR VIEW ───
  if (isEditorOpen) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)}>← Back to Pages</Button>
            <h1 className="text-2xl font-bold mt-1">{editorTitle || "New Landing Page"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleCopyHtml(editorPreviewHtml)}><Copy className="h-4 w-4 mr-1" />Copy HTML</Button>
            <Button variant="outline" size="sm" onClick={() => handleDownloadHtml(editorPreviewHtml, editorTitle || "landing-page")}><Download className="h-4 w-4 mr-1" />Download</Button>
            <Button size="sm" onClick={handleSavePage} disabled={createPage.isPending}>{createPage.isPending ? "Saving..." : "Save Page"}</Button>
          </div>
        </div>

        {/* Form webhook info */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-3 flex items-center gap-3 text-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Form Webhook URL:</span>
            <code className="text-xs bg-background px-2 py-1 rounded border font-mono flex-1 truncate">{webhookUrl}</code>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: "Webhook URL Copied!" }); }}><Copy className="h-3 w-3" /></Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-[400px_1fr] gap-4">
          {/* Left: Editor Fields */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Page Content</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1"><Label className="text-xs">Page Title (H1)</Label><Input value={editorTitle} onChange={e => setEditorTitle(e.target.value)} placeholder="Your amazing headline" /></div>
                <div className="space-y-1"><Label className="text-xs">Subtitle (H2)</Label><Input value={editorSubtitle} onChange={e => setEditorSubtitle(e.target.value)} placeholder="Supporting text" /></div>
                <div className="space-y-1"><Label className="text-xs">Hero Image URL</Label><Input value={editorHeroImage} onChange={e => setEditorHeroImage(e.target.value)} placeholder="https://..." /></div>
                <div className="space-y-1"><Label className="text-xs">Body Content (HTML)</Label><Textarea value={editorBody} onChange={e => setEditorBody(e.target.value)} placeholder="<p>Your content here...</p>" rows={4} className="font-mono text-xs" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">CTA & Form</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div className="space-y-1"><Label className="text-xs">Button Text</Label><Input value={editorCtaText} onChange={e => setEditorCtaText(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Color</Label><Input type="color" value={editorCtaColor} onChange={e => setEditorCtaColor(e.target.value)} className="h-9 p-1" /></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Form Fields</Label>
                  <div className="space-y-1.5">
                    {formFieldOptions.map(f => (
                      <div key={f.key} className="flex items-center gap-2">
                        <Checkbox checked={editorFormFields.includes(f.key)} onCheckedChange={() => toggleFormField(f.key)} id={`field-${f.key}`} />
                        <Label htmlFor={`field-${f.key}`} className="text-sm cursor-pointer">{f.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Thank You Message</Label><Input value={editorThankYou} onChange={e => setEditorThankYou(e.target.value)} /></div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground px-1">Form submissions are automatically saved as leads in your CRM with source='landing_page'</p>

            {/* SEO & Meta */}
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">SEO & Meta</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Meta Title</Label>
                  <Input value={editorMetaTitle} onChange={e => setEditorMetaTitle(e.target.value)} placeholder={editorTitle || "Page title for search engines"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meta Description</Label>
                  <Textarea value={editorMetaDescription} onChange={e => setEditorMetaDescription(e.target.value)} placeholder="Brief description for search results (150-160 chars)" rows={2} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Live Preview */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Live Preview</CardTitle>
                <div className="flex gap-1">
                  <Button variant={previewMode === "desktop" ? "default" : "outline"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewMode("desktop")}><Monitor className="h-3.5 w-3.5" /></Button>
                  <Button variant={previewMode === "mobile" ? "default" : "outline"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewMode("mobile")}><Smartphone className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="border rounded-lg overflow-hidden bg-muted/20">
                <iframe
                  srcDoc={editorPreviewHtml}
                  className="w-full bg-white transition-all"
                  style={{ maxWidth: previewMode === "mobile" ? "375px" : "100%", margin: "0 auto", display: "block", minHeight: "600px" }}
                  title="Live Preview"
                  sandbox=""
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── MAIN LIST VIEW ───
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Integration note */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 flex items-center gap-3 text-sm">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>Landing page forms automatically create leads in your CRM with source='landing_page'. Form submissions go to webhook and enter the automated sequence pipeline.</span>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground mt-1">Create high-converting landing pages with built-in lead capture</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Page</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Pages", value: stats.total, icon: Globe },
          { label: "Published", value: stats.published, icon: Check },
          { label: "Total Views", value: stats.totalViews.toLocaleString(), icon: Eye },
          { label: "Conversions", value: stats.totalConversions.toLocaleString(), icon: MousePointer },
          { label: "Avg. CVR", value: `${avgCvr}%`, icon: TrendingUp },
        ].map(stat => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><stat.icon className="h-4 w-4 text-muted-foreground" /></div>
                <div><p className="text-xl font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pages">My Pages ({pages.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-6">
          {pages.length === 0 ? (
            <Card className="p-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-semibold">No landing pages yet</p>
              <p className="text-muted-foreground mb-4">Create your first high-converting landing page</p>
              <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Page</Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page: any) => (
                <Card key={page.id} className="overflow-hidden hover:shadow-md transition-all">
                  <div className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                    <Layout className="h-10 w-10 text-primary/30" />
                    <div className="absolute top-2 right-2">
                      <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>{page.status === 'published' ? '● Published' : 'Draft'}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{page.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Created {format(new Date(page.created_at), "MMM d, yyyy")}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            const injected = injectFormAction(page.html_content || "", tenantConfig?.id || '', page.id);
                            setPreviewHtml(injected);
                            setPreviewPageName(page.name);
                          }}><Eye className="h-4 w-4 mr-2" />Preview</DropdownMenuItem>
                          {page.status === "draft" && (
                            <DropdownMenuItem onClick={() => publishPage.mutateAsync(page.id)}><Check className="h-4 w-4 mr-2" />Publish</DropdownMenuItem>
                          )}
                          {page.status === "published" && (
                            <DropdownMenuItem onClick={() => window.open(`/lp/${page.slug || page.id}`, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />View Public Page</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleCopyHtml(page.html_content || "")}><Copy className="h-4 w-4 mr-2" />Copy HTML</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadHtml(page.html_content || "", page.name)}><Download className="h-4 w-4 mr-2" />Download HTML</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: "Form Webhook URL Copied!" }); }}><ExternalLink className="h-4 w-4 mr-2" />Copy Form URL</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => deletePage.mutateAsync(page.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Per-page stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-lg font-bold">{(page.views || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{(page.conversions || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Conversions</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold ${(page.conversion_rate || 0) > 0 ? 'text-green-600' : ''}`}>{page.conversion_rate || 0}%</p>
                        <p className="text-[10px] text-muted-foreground">CVR</p>
                      </div>
                    </div>

                    {page.status === 'published' && (
                      <a
                        href={`/lp/${page.slug || page.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-xs text-primary hover:underline text-center truncate"
                      >
                        {window.location.origin}/lp/{page.slug || page.id}
                      </a>
                    )}
                    {(page.views || 0) === 0 && page.status === 'published' && (
                      <p className="text-xs text-muted-foreground mt-1 text-center italic">No visits yet. Share the link above to start collecting leads.</p>
                    )}

                    {page.status === "draft" && (
                      <div className="flex gap-2 mt-3">
                        <Button className="flex-1" size="sm" onClick={() => publishPage.mutateAsync(page.id)}>Publish</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <p className="text-sm text-muted-foreground">Choose a template to start with. You can customize everything in the editor.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageTemplates.map(template => (
              <Card key={template.id} className="cursor-pointer hover:border-primary hover:shadow-md transition-all group">
                <div className="h-32 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                  <template.icon className={`h-10 w-10 ${template.color.split(' ')[1]}`} />
                </div>
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2 text-xs">{template.name}</Badge>
                  <p className="text-sm text-muted-foreground">{template.desc}</p>
                  <Button className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity" size="sm" onClick={() => { setSelectedTemplate(template); openEditor(template); }}>
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Page Dialog (template gallery) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Landing Page</DialogTitle>
            <DialogDescription>Choose a template or start from scratch</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => openEditor()}>
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-2"><Plus className="h-6 w-6 text-muted-foreground" /></div>
                <p className="font-medium text-sm">Blank Page</p>
                <p className="text-xs text-muted-foreground">Start from scratch</p>
              </CardContent>
            </Card>
            {pageTemplates.map(tmpl => (
              <Card key={tmpl.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setSelectedTemplate(tmpl); openEditor(tmpl); }}>
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 rounded-xl ${tmpl.color} flex items-center justify-center mx-auto mb-2`}><tmpl.icon className="h-6 w-6" /></div>
                  <p className="font-medium text-sm">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{tmpl.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Preview: {previewPageName}</span>
              <div className="flex gap-2">
                <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")}><Monitor className="h-4 w-4" /></Button>
                <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")}><Smartphone className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => handleCopyHtml(previewHtml || "")}><Copy className="h-4 w-4 mr-1" />Copy HTML</Button>
                <Button size="sm" variant="outline" onClick={() => handleDownloadHtml(previewHtml || "", previewPageName)}><Download className="h-4 w-4 mr-1" />Download</Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            <iframe
              srcDoc={previewHtml || ""}
              className="w-full h-full border-0"
              style={{ maxWidth: previewMode === "mobile" ? "375px" : "100%", margin: "0 auto", display: "block", minHeight: "500px" }}
              title="Landing Page Preview"
              sandbox="allow-scripts"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings link */}
      <p className="text-xs text-muted-foreground mt-6">
        💡 To host landing pages on your domain, configure your website URL in{' '}
        <button className="text-primary underline hover:no-underline" onClick={() => navigate('/settings/integrations')}>Settings → Integrations</button>
      </p>
    </div>
  );
}
