import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LayoutTemplate, Film, Palette, Eye, Sparkles, Plus, Trash2, ArrowUp, ArrowDown,
  Save, Globe, Grid3X3, MessageSquare, DollarSign, HelpCircle, BarChart3, Send,
  Image as ImageIcon, Code, Loader2, ChevronLeft, Copy, ExternalLink
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { usePageTemplates, usePremiumPages, usePremiumPage, useCreatePremiumPage, useUpdatePremiumPage, useDeletePremiumPage, useExtractFrames } from "@/hooks/usePremiumPages";
import { generatePremiumHtml, SECTION_TYPES, type PremiumPageData, type SectionConfig, type PageTheme } from "@/lib/premiumPageHtmlGenerator";

const DEFAULT_THEME: PageTheme = {
  primaryColor: "#7c3aed", secondaryColor: "#ec4899", bgColor: "#0a0a0a",
  textColor: "#ffffff", fontHeading: "Inter", fontBody: "Inter", borderRadius: "8px",
};

const SECTION_ICONS: Record<string, any> = {
  hero_scroll: Film, hero_gradient: Sparkles, features_grid: Grid3X3,
  testimonials: MessageSquare, pricing: DollarSign, faq: HelpCircle,
  cta_form: Send, stats: BarChart3, gallery: ImageIcon, custom_html: Code,
};

const CATEGORY_COLORS: Record<string, string> = {
  product: "from-purple-600 to-pink-600", landing: "from-blue-600 to-cyan-600",
  portfolio: "from-amber-600 to-orange-600", event: "from-rose-600 to-red-600",
  coming_soon: "from-violet-600 to-purple-600",
};

const PremiumPageBuilder = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const { data: templates = [] } = usePageTemplates();
  const { data: pages = [] } = usePremiumPages();
  const { data: existingPage } = usePremiumPage(pageId);
  const createPage = useCreatePremiumPage();
  const updatePage = useUpdatePremiumPage();
  const deletePage = useDeletePremiumPage();
  const extractFrames = useExtractFrames();

  // Page state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [theme, setTheme] = useState<PageTheme>(DEFAULT_THEME);
  const [hasScroll, setHasScroll] = useState(false);
  const [scrollVideoUrl, setScrollVideoUrl] = useState("");
  const [scrollFrameUrls, setScrollFrameUrls] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [activeTab, setActiveTab] = useState(pageId ? "sections" : "templates");
  const [frameCount, setFrameCount] = useState(30);
  const [frameQuality, setFrameQuality] = useState("medium");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Load existing page
  useEffect(() => {
    if (existingPage) {
      setName(existingPage.name || "");
      setSlug(existingPage.slug || "");
      let s = existingPage.sections;
      if (typeof s === "string") try { s = JSON.parse(s); } catch { s = []; }
      setSections(s || []);
      setTheme(typeof existingPage.theme === "string" ? JSON.parse(existingPage.theme) : (existingPage.theme || DEFAULT_THEME));
      setHasScroll(existingPage.has_scroll_animation || false);
      setScrollVideoUrl(existingPage.scroll_video_url || "");
      setScrollFrameUrls(existingPage.scroll_frame_urls || []);
      setMetaTitle(existingPage.meta_title || "");
      setMetaDescription(existingPage.meta_description || "");
      setFormEnabled(existingPage.form_enabled ?? true);
      setActiveTab("sections");
    }
  }, [existingPage]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!pageId && name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [name, pageId]);

  // Preview HTML (memoized)
  const previewHtml = useMemo(() => {
    return generatePremiumHtml({
      id: pageId || "preview",
      tenant_id: tenantConfig?.id || "",
      name, slug, sections, theme,
      has_scroll_animation: hasScroll,
      scroll_frame_urls: scrollFrameUrls,
      scroll_config: { overlayOpacity: 0.3 },
      meta_title: metaTitle || name,
      meta_description: metaDescription,
      form_enabled: formEnabled,
    });
  }, [name, slug, sections, theme, hasScroll, scrollFrameUrls, metaTitle, metaDescription, formEnabled, pageId, tenantConfig?.id]);

  // ========== ACTIONS ==========

  const useTemplate = (template: any) => {
    setName(`${template.name} - ${new Date().toLocaleDateString()}`);
    let s = template.sections;
    if (typeof s === "string") try { s = JSON.parse(s); } catch { s = []; }
    setSections((s || []).map((sec: any, i: number) => ({ ...sec, id: crypto.randomUUID(), order: i })));
    let t = template.theme;
    if (typeof t === "string") try { t = JSON.parse(t); } catch { t = {}; }
    setTheme({ ...DEFAULT_THEME, ...t });
    setHasScroll(template.has_scroll_animation || false);
    setActiveTab("sections");
    toast({ title: "Template Applied", description: `Using "${template.name}" as starting point.` });
  };

  const addSection = (type: string) => {
    setSections(prev => [...prev, { id: crypto.randomUUID(), type, config: {}, order: prev.length }]);
    setShowAddSection(false);
    setSelectedSection(sections.length);
  };

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx));
    setSelectedSection(null);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    setSections(prev => {
      const arr = [...prev];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
    setSelectedSection(target);
  };

  const updateSectionConfig = (idx: number, config: Record<string, any>) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, config: { ...s.config, ...config } } : s));
  };

  const savePage = async (publish = false) => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: "Error", description: "Name and slug are required", variant: "destructive" });
      return;
    }
    const pageData: Record<string, any> = {
      name, slug, page_type: "landing", sections: JSON.stringify(sections), theme: JSON.stringify(theme),
      has_scroll_animation: hasScroll, scroll_video_url: scrollVideoUrl || null,
      scroll_frame_urls: scrollFrameUrls.length > 0 ? scrollFrameUrls : null,
      scroll_frame_count: scrollFrameUrls.length, meta_title: metaTitle || name,
      meta_description: metaDescription, form_enabled: formEnabled,
      status: publish ? "published" : "draft",
      ...(publish ? { published_at: new Date().toISOString() } : {}),
    };

    if (pageId) {
      await updatePage.mutateAsync({ id: pageId, ...pageData });
      toast({ title: publish ? "Published!" : "Saved", description: publish ? `Live at /p/${slug}` : "Draft saved." });
    } else {
      const result = await createPage.mutateAsync(pageData);
      if (result?.id) navigate(`/marketing/page-builder/${result.id}`);
    }
  };

  const handleExtractFrames = async () => {
    if (!scrollVideoUrl || !tenantConfig?.id) return;
    const result = await extractFrames.mutateAsync({
      video_url: scrollVideoUrl, tenant_id: tenantConfig.id,
      project_id: pageId || "new-page", frame_count: frameCount, quality: frameQuality,
    });
    if (result.frame_urls) {
      setScrollFrameUrls(result.frame_urls);
      setHasScroll(true);
    }
  };

  // ========== RENDER ==========

  const filteredTemplates = categoryFilter === "all" ? templates : templates.filter((t: any) => t.category === categoryFilter);
  const categories = [...new Set(templates.map((t: any) => t.category))] as string[];

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/marketing/page-builder")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Page Builder</h1>
            <p className="text-sm text-muted-foreground">Premium pages with scroll-animated video backgrounds</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => savePage(false)} disabled={createPage.isPending || updatePage.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button onClick={() => savePage(true)} disabled={createPage.isPending || updatePage.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Globe className="h-4 w-4 mr-2" /> Publish
          </Button>
        </div>
      </div>

      {/* PAGE NAME + SLUG */}
      {(pageId || activeTab !== "templates") && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Page Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Landing Page" className="mt-1" />
          </div>
          <div>
            <Label>URL Slug</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">/p/</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-page" />
              {slug && (
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`); toast({ title: "Copied!" }); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-1"><LayoutTemplate className="h-3 w-3" /> Templates</TabsTrigger>
          <TabsTrigger value="sections" className="gap-1"><Grid3X3 className="h-3 w-3" /> Sections</TabsTrigger>
          <TabsTrigger value="theme" className="gap-1"><Palette className="h-3 w-3" /> Theme</TabsTrigger>
          <TabsTrigger value="animation" className="gap-1"><Film className="h-3 w-3" /> Animation</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1"><Eye className="h-3 w-3" /> Preview</TabsTrigger>
        </TabsList>

        {/* TAB: TEMPLATES */}
        <TabsContent value="templates" className="mt-4">
          {/* My Pages */}
          {pages.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold mb-3">My Pages ({pages.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pages.map((p: any) => (
                  <Card key={p.id} className="cursor-pointer hover:border-purple-500/50 transition-colors"
                    onClick={() => navigate(`/marketing/page-builder/${p.id}`)}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">/p/{p.slug}</p>
                        </div>
                        <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{p.views || 0} views</span>
                        {p.has_scroll_animation && <Badge variant="outline" className="text-xs">Scroll</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Template Gallery */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Templates ({filteredTemplates.length})</h3>
            <div className="flex gap-1">
              <button onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1 rounded-full text-xs ${categoryFilter === "all" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>All</button>
              {categories.map(c => (
                <button key={c} onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1 rounded-full text-xs capitalize ${categoryFilter === c ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{c.replace("_", " ")}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Blank Page card */}
            <div className="group cursor-pointer rounded-xl overflow-hidden border border-dashed hover:border-purple-500/50 transition-all"
              onClick={() => { setName("New Page"); setSections([]); setTheme(DEFAULT_THEME); setActiveTab("sections"); }}>
              <div className="h-32 flex items-center justify-center bg-muted/30">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="p-3"><h3 className="font-semibold text-sm">Start from Scratch</h3><p className="text-xs text-muted-foreground">Build your page section by section</p></div>
            </div>
            {filteredTemplates.map((t: any) => (
              <div key={t.id} className="group cursor-pointer rounded-xl overflow-hidden border hover:border-purple-500/50 transition-all"
                onClick={() => useTemplate(t)}>
                <div className={`h-32 bg-gradient-to-br ${CATEGORY_COLORS[t.category] || "from-gray-600 to-gray-700"} flex items-center justify-center relative`}>
                  <Film className="h-10 w-10 text-white/40" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {t.has_scroll_animation && <Badge className="bg-black/50 text-white border-none text-[10px]">Scroll</Badge>}
                    {t.has_video_background && <Badge className="bg-black/50 text-white border-none text-[10px]">Video</Badge>}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{t.category?.replace("_", " ")}</Badge>
                    {t.industry && <Badge variant="outline" className="text-[10px] capitalize">{t.industry}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB: SECTIONS */}
        <TabsContent value="sections" className="mt-4">
          <div className="grid grid-cols-5 gap-4">
            {/* Section List */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Sections ({sections.length})</h3>
                <Button size="sm" variant="outline" onClick={() => setShowAddSection(true)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              {sections.map((s, i) => {
                const Icon = SECTION_ICONS[s.type] || Grid3X3;
                return (
                  <div key={s.id || i} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selectedSection === i ? "border-purple-500 bg-purple-500/5" : "hover:border-muted-foreground/30"}`}
                    onClick={() => setSelectedSection(i)}>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{s.type.replace(/_/g, " ")}</p>
                      {s.config?.title && <p className="text-xs text-muted-foreground truncate">{s.config.title}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); moveSection(i, -1); }} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); moveSection(i, 1); }} disabled={i === sections.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeSection(i); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                );
              })}
              {sections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No sections yet</p>
                  <p className="text-xs">Pick a template or add sections manually</p>
                </div>
              )}
            </div>

            {/* Section Editor */}
            <div className="col-span-3">
              {selectedSection !== null && sections[selectedSection] ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm capitalize">{sections[selectedSection].type.replace(/_/g, " ")} Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><Label className="text-xs">Section Title</Label>
                      <Input value={sections[selectedSection].config?.title || ""} onChange={(e) => updateSectionConfig(selectedSection, { title: e.target.value })} placeholder="Section title" className="mt-1" /></div>
                    <div><Label className="text-xs">Subtitle</Label>
                      <Input value={sections[selectedSection].config?.subtitle || ""} onChange={(e) => updateSectionConfig(selectedSection, { subtitle: e.target.value })} placeholder="Subtitle text" className="mt-1" /></div>
                    {["hero_scroll", "hero_gradient"].includes(sections[selectedSection].type) && (
                      <>
                        <div><Label className="text-xs">Headline</Label>
                          <Input value={sections[selectedSection].config?.headline || ""} onChange={(e) => updateSectionConfig(selectedSection, { headline: e.target.value })} placeholder="Your main headline" className="mt-1" /></div>
                        <div><Label className="text-xs">Subheadline</Label>
                          <Textarea value={sections[selectedSection].config?.subheadline || ""} onChange={(e) => updateSectionConfig(selectedSection, { subheadline: e.target.value })} placeholder="Supporting text" rows={2} className="mt-1" /></div>
                        <div><Label className="text-xs">CTA Button Text</Label>
                          <Input value={sections[selectedSection].config?.ctaText || ""} onChange={(e) => updateSectionConfig(selectedSection, { ctaText: e.target.value })} placeholder="Get Started" className="mt-1" /></div>
                      </>
                    )}
                    {sections[selectedSection].type === "custom_html" && (
                      <div><Label className="text-xs">Custom HTML</Label>
                        <Textarea value={sections[selectedSection].config?.html || ""} onChange={(e) => updateSectionConfig(selectedSection, { html: e.target.value })} placeholder="<div>Your HTML here</div>" rows={8} className="mt-1 font-mono text-xs" /></div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p className="text-sm">Select a section to edit its properties</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          {sections.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Page Structure</span>
                <span className="text-xs text-muted-foreground">{sections.length} sections</span>
              </div>
              <div className="flex gap-1 h-6">
                {sections.map((s, i) => (
                  <div key={s.id || i} className={`rounded flex items-center justify-center text-[10px] font-medium cursor-pointer transition-all flex-1 ${selectedSection === i ? "ring-2 ring-purple-500" : ""} ${i % 4 === 0 ? "bg-purple-600/80 text-white" : i % 4 === 1 ? "bg-pink-600/80 text-white" : i % 4 === 2 ? "bg-blue-600/80 text-white" : "bg-orange-600/80 text-white"}`}
                    onClick={() => setSelectedSection(i)} title={s.type.replace(/_/g, " ")}>
                    {s.type.split("_")[0]}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB: THEME */}
        <TabsContent value="theme" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Colors</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "primaryColor", label: "Primary" },
                  { key: "secondaryColor", label: "Secondary" },
                  { key: "bgColor", label: "Background" },
                  { key: "textColor", label: "Text" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <input type="color" value={(theme as any)[key] || "#000000"} onChange={(e) => setTheme(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer border" />
                    <Label className="text-xs flex-1">{label}</Label>
                    <Input value={(theme as any)[key] || ""} onChange={(e) => setTheme(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-28 h-7 text-xs font-mono" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Typography</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Heading Font</Label>
                  <Select value={theme.fontHeading} onValueChange={(v) => setTheme(prev => ({ ...prev, fontHeading: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Inter", "Poppins", "Playfair Display", "Space Grotesk", "Lora", "Roboto", "Montserrat", "Raleway"].map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Body Font</Label>
                  <Select value={theme.fontBody} onValueChange={(v) => setTheme(prev => ({ ...prev, fontBody: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Inter", "Lora", "Roboto", "Open Sans", "Source Sans Pro", "Nunito"].map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Border Radius</Label>
                  <Select value={theme.borderRadius || "8px"} onValueChange={(v) => setTheme(prev => ({ ...prev, borderRadius: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0px">Sharp</SelectItem>
                      <SelectItem value="4px">Subtle</SelectItem>
                      <SelectItem value="8px">Rounded</SelectItem>
                      <SelectItem value="16px">Pill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">SEO</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Meta Title</Label>
                  <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={name || "Page title"} className="mt-1" /></div>
                <div><Label className="text-xs">Meta Description</Label>
                  <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Page description for search engines" rows={3} className="mt-1" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Form</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} className="rounded" />
                  <Label className="text-xs">Enable lead capture form</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: ANIMATION */}
        <TabsContent value="animation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Film className="h-4 w-4" /> Scroll Animation Setup</CardTitle>
              <p className="text-xs text-muted-foreground">Add an Apple-style video background that plays as users scroll</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Video URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={scrollVideoUrl} onChange={(e) => setScrollVideoUrl(e.target.value)}
                    placeholder="https://... (Supabase Storage, Pexels, or direct video URL)" className="flex-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Frame Count</Label>
                  <Select value={String(frameCount)} onValueChange={(v) => setFrameCount(Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[15, 30, 45, 60, 90, 120].map(n => <SelectItem key={n} value={String(n)}>{n} frames</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Quality</Label>
                  <Select value={frameQuality} onValueChange={setFrameQuality}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (480p)</SelectItem>
                      <SelectItem value="medium">Medium (720p)</SelectItem>
                      <SelectItem value="high">High (1080p)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleExtractFrames} disabled={!scrollVideoUrl || extractFrames.isPending} className="w-full">
                {extractFrames.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting Frames...</> : <><Film className="h-4 w-4 mr-2" /> Extract Frames</>}
              </Button>
              {scrollFrameUrls.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{scrollFrameUrls.length} frames extracted</p>
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {scrollFrameUrls.slice(0, 20).map((url, i) => (
                      <img key={i} src={url} alt={`Frame ${i}`} className="h-16 w-auto rounded border shrink-0" loading="lazy" />
                    ))}
                    {scrollFrameUrls.length > 20 && (
                      <div className="h-16 w-16 rounded border flex items-center justify-center text-xs text-muted-foreground shrink-0">+{scrollFrameUrls.length - 20}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: PREVIEW */}
        <TabsContent value="preview" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {["desktop", "tablet", "mobile"].map(d => (
                <button key={d} onClick={() => setPreviewDevice(d)}
                  className={`px-3 py-1 rounded text-xs capitalize ${previewDevice === d ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}>{d}</button>
              ))}
            </div>
            {slug && existingPage?.status === "published" && (
              <Button size="sm" variant="outline" asChild>
                <a href={`/p/${slug}`} target="_blank" rel="noopener"><ExternalLink className="h-3 w-3 mr-1" /> Open Live Page</a>
              </Button>
            )}
          </div>
          <div className={`mx-auto border rounded-lg overflow-hidden bg-black ${previewDevice === "mobile" ? "max-w-[375px]" : previewDevice === "tablet" ? "max-w-[768px]" : "max-w-full"}`}>
            <iframe srcDoc={previewHtml} className="w-full border-none" style={{ height: "80vh" }}
              sandbox="allow-scripts allow-same-origin" title="Page Preview" />
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD SECTION DIALOG */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Section</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {SECTION_TYPES.map(({ type, label, premium }) => {
              const Icon = SECTION_ICONS[type] || Grid3X3;
              return (
                <button key={type} onClick={() => addSection(type)}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    {premium && <Badge variant="outline" className="text-[10px] mt-1">Premium</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PremiumPageBuilder;
