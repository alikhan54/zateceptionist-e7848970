/**
 * Premium Page HTML Generator
 * Generates complete standalone HTML documents with scroll-animated video backgrounds.
 * Used by PremiumPageBuilder (preview) and PremiumPage (public renderer).
 */

// ============================================================
// TYPES
// ============================================================

export interface PageTheme {
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius?: string;
}

export interface SectionConfig {
  id?: string;
  type: string;
  config: Record<string, any>;
  order?: number;
}

export interface PremiumPageData {
  id?: string;
  tenant_id?: string;
  name: string;
  slug?: string;
  sections: SectionConfig[];
  theme: PageTheme;
  has_scroll_animation?: boolean;
  scroll_frame_urls?: string[];
  scroll_config?: { speed?: number; overlayOpacity?: number };
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  schema_json?: Record<string, any>;
  custom_css?: string;
  form_enabled?: boolean;
  form_fields?: Array<{ name: string; label: string; type: string; required?: boolean }>;
  form_webhook_url?: string;
  form_success_message?: string;
}

// ============================================================
// SECTION TYPES
// ============================================================

export const SECTION_TYPES = [
  { type: "hero_scroll", label: "Scroll Animation Hero", premium: true },
  { type: "hero_gradient", label: "Gradient Hero" },
  { type: "features_grid", label: "Features Grid" },
  { type: "testimonials", label: "Testimonials" },
  { type: "pricing", label: "Pricing Table" },
  { type: "faq", label: "FAQ Accordion" },
  { type: "cta_form", label: "CTA + Form" },
  { type: "stats", label: "Stats Counter" },
  { type: "gallery", label: "Image Gallery" },
  { type: "custom_html", label: "Custom HTML" },
] as const;

// ============================================================
// MAIN GENERATOR
// ============================================================

export function generatePremiumHtml(page: PremiumPageData): string {
  const t = page.theme;
  const hasScroll = page.has_scroll_animation && page.scroll_frame_urls && page.scroll_frame_urls.length > 0;
  const overlayOpacity = page.scroll_config?.overlayOpacity ?? 0.3;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(page.meta_title || page.name)}</title>
${page.meta_description ? `<meta name="description" content="${esc(page.meta_description)}">` : ""}
${page.og_image ? `<meta property="og:image" content="${esc(page.og_image)}">` : ""}
<meta property="og:title" content="${esc(page.meta_title || page.name)}">
${page.schema_json ? `<script type="application/ld+json">${JSON.stringify(page.schema_json)}</script>` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.fontHeading)}:wght@400;600;700;800&family=${encodeURIComponent(t.fontBody)}:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --primary: ${t.primaryColor};
  --secondary: ${t.secondaryColor};
  --bg: ${t.bgColor};
  --text: ${t.textColor};
  --font-heading: '${t.fontHeading}', sans-serif;
  --font-body: '${t.fontBody}', sans-serif;
  --radius: ${t.borderRadius || "8px"};
}
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: var(--font-body); background: var(--bg); color: var(--text); line-height: 1.6; overflow-x: hidden; }
h1, h2, h3, h4 { font-family: var(--font-heading); line-height: 1.2; }
.section { padding: 80px 24px; max-width: 1200px; margin: 0 auto; }
.section-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; text-align: center; }
.section-subtitle { font-size: 1.1rem; opacity: 0.7; text-align: center; max-width: 600px; margin: 0 auto 48px; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border: none; border-radius: var(--radius); font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; }
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px color-mix(in srgb, var(--primary) 40%, transparent); }
.btn-secondary { background: transparent; color: var(--text); border: 2px solid color-mix(in srgb, var(--text) 30%, transparent); }
.btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
input, textarea, select { width: 100%; padding: 14px 18px; border: 1px solid color-mix(in srgb, var(--text) 15%, transparent); border-radius: var(--radius); background: color-mix(in srgb, var(--text) 5%, transparent); color: var(--text); font-size: 1rem; font-family: var(--font-body); transition: border-color 0.3s; }
input:focus, textarea:focus { outline: none; border-color: var(--primary); }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .section { padding: 48px 16px; }
  .section-title { font-size: 1.8rem; }
}
${hasScroll ? `
#scroll-canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -2; pointer-events: none; }
.scroll-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,${overlayOpacity}); z-index: -1; pointer-events: none; }
.scroll-spacer { position: relative; z-index: 1; }
` : ""}
${page.custom_css || ""}
</style>
</head>
<body>
${hasScroll ? `<canvas id="scroll-canvas"></canvas><div class="scroll-overlay"></div>` : ""}
<div class="${hasScroll ? "scroll-spacer" : ""}">
${page.sections.map((s) => renderSection(s, t, page)).join("\n")}
</div>
${hasScroll ? renderScrollEngine(page.scroll_frame_urls!, overlayOpacity) : ""}
${renderAnalytics(page)}
</body>
</html>`;
}

// ============================================================
// SECTION RENDERERS
// ============================================================

function renderSection(s: SectionConfig, t: PageTheme, page: PremiumPageData): string {
  switch (s.type) {
    case "hero_scroll": return renderHeroScroll(s.config, t);
    case "hero_gradient": return renderHeroGradient(s.config, t);
    case "features_grid": return renderFeaturesGrid(s.config, t);
    case "testimonials": return renderTestimonials(s.config, t);
    case "pricing": return renderPricing(s.config, t);
    case "faq": return renderFAQ(s.config, t);
    case "cta_form": return renderCTAForm(s.config, t, page);
    case "stats": return renderStats(s.config, t);
    case "gallery": return renderGallery(s.config, t);
    case "custom_html": return s.config.html || "";
    default: return `<div class="section"><p>Unknown section: ${s.type}</p></div>`;
  }
}

function renderHeroScroll(c: Record<string, any>, t: PageTheme): string {
  const height = c.height || "300vh";
  return `<div style="min-height:${height};display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 24px;">
  <div style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;">
    <h1 style="font-size:clamp(2.5rem,6vw,5rem);font-weight:800;max-width:900px;margin-bottom:24px;">${esc(c.headline || "Your Story Begins Here")}</h1>
    <p style="font-size:1.25rem;opacity:0.8;max-width:600px;margin-bottom:32px;">${esc(c.subheadline || "Scroll down to discover more")}</p>
    ${c.ctaText ? `<a href="${c.ctaUrl || "#cta"}" class="btn btn-primary">${esc(c.ctaText)}</a>` : ""}
  </div>
  ${c.overlayText ? `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;">
    <p style="font-size:clamp(1.2rem,3vw,2rem);max-width:700px;text-align:center;opacity:0.9;">${esc(c.middleText || "")}</p>
  </div>` : ""}
</div>`;
}

function renderHeroGradient(c: Record<string, any>, t: PageTheme): string {
  return `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:80px 24px;background:linear-gradient(135deg,${t.primaryColor}20,${t.secondaryColor}20);">
  <div style="max-width:800px;">
    <h1 style="font-size:clamp(2.5rem,5vw,4rem);font-weight:800;margin-bottom:20px;">${esc(c.headline || "Welcome")}</h1>
    <p style="font-size:1.2rem;opacity:0.8;margin-bottom:32px;">${esc(c.subheadline || "Your next chapter starts here")}</p>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
      ${c.ctaText ? `<a href="${c.ctaUrl || "#cta"}" class="btn btn-primary">${esc(c.ctaText)}</a>` : ""}
      ${c.secondaryCtaText ? `<a href="${c.secondaryCtaUrl || "#"}" class="btn btn-secondary">${esc(c.secondaryCtaText)}</a>` : ""}
    </div>
  </div>
</div>`;
}

function renderFeaturesGrid(c: Record<string, any>, t: PageTheme): string {
  const cols = c.columns || 3;
  const features: Array<{ title: string; description: string; icon?: string }> = c.features || [
    { title: "Feature One", description: "Description of the first feature" },
    { title: "Feature Two", description: "Description of the second feature" },
    { title: "Feature Three", description: "Description of the third feature" },
  ];
  return `<div class="section">
  ${c.title ? `<h2 class="section-title">${esc(c.title)}</h2>` : ""}
  ${c.subtitle ? `<p class="section-subtitle">${esc(c.subtitle)}</p>` : ""}
  <div class="grid-${cols}">
    ${features.map((f) => `<div style="padding:32px;border-radius:var(--radius);background:color-mix(in srgb,var(--text) 5%,transparent);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);">
      ${f.icon ? `<div style="font-size:2rem;margin-bottom:12px;">${f.icon}</div>` : ""}
      <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px;">${esc(f.title)}</h3>
      <p style="opacity:0.7;font-size:0.95rem;">${esc(f.description)}</p>
    </div>`).join("\n")}
  </div>
</div>`;
}

function renderTestimonials(c: Record<string, any>, t: PageTheme): string {
  const items: Array<{ quote: string; name: string; role: string }> = c.testimonials || [
    { quote: "This product transformed our business.", name: "Jane D.", role: "CEO" },
    { quote: "Incredible results in just 30 days.", name: "John S.", role: "Marketing Director" },
  ];
  return `<div class="section" style="background:color-mix(in srgb,var(--primary) 5%,transparent);border-radius:16px;margin:40px auto;">
  ${c.title ? `<h2 class="section-title">${esc(c.title || "What Our Clients Say")}</h2>` : `<h2 class="section-title">What Our Clients Say</h2>`}
  <div class="grid-2" style="margin-top:40px;">
    ${items.map((item) => `<div style="padding:32px;border-radius:var(--radius);background:color-mix(in srgb,var(--text) 5%,transparent);">
      <p style="font-size:1.1rem;font-style:italic;margin-bottom:16px;opacity:0.9;">"${esc(item.quote)}"</p>
      <p style="font-weight:600;">${esc(item.name)}</p>
      <p style="font-size:0.85rem;opacity:0.6;">${esc(item.role)}</p>
    </div>`).join("\n")}
  </div>
</div>`;
}

function renderPricing(c: Record<string, any>, t: PageTheme): string {
  const plans: Array<{ name: string; price: string; period?: string; features: string[]; cta?: string; highlighted?: boolean }> = c.plans_data || [
    { name: "Starter", price: "$29", period: "/mo", features: ["5 Projects", "Basic Support", "1 User"], cta: "Get Started" },
    { name: "Pro", price: "$79", period: "/mo", features: ["Unlimited Projects", "Priority Support", "5 Users", "Analytics"], cta: "Start Trial", highlighted: true },
    { name: "Enterprise", price: "Custom", features: ["Everything in Pro", "Dedicated Manager", "Custom Integrations", "SLA"], cta: "Contact Sales" },
  ];
  return `<div class="section">
  ${c.title ? `<h2 class="section-title">${esc(c.title)}</h2>` : `<h2 class="section-title">Choose Your Plan</h2>`}
  <div class="grid-${plans.length}" style="margin-top:40px;align-items:start;">
    ${plans.map((p) => `<div style="padding:32px;border-radius:var(--radius);border:${p.highlighted ? `2px solid var(--primary)` : `1px solid color-mix(in srgb,var(--text) 15%,transparent)`};${p.highlighted ? `background:color-mix(in srgb,var(--primary) 8%,transparent);` : ""}text-align:center;">
      <h3 style="font-size:1.2rem;font-weight:700;">${esc(p.name)}</h3>
      <div style="font-size:2.5rem;font-weight:800;margin:16px 0;">${esc(p.price)}<span style="font-size:1rem;opacity:0.6;">${p.period || ""}</span></div>
      <ul style="list-style:none;margin:24px 0;text-align:left;">
        ${p.features.map((f) => `<li style="padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--text) 8%,transparent);">✓ ${esc(f)}</li>`).join("")}
      </ul>
      <a href="#cta" class="btn ${p.highlighted ? "btn-primary" : "btn-secondary"}" style="width:100%;justify-content:center;">${esc(p.cta || "Get Started")}</a>
    </div>`).join("\n")}
  </div>
</div>`;
}

function renderFAQ(c: Record<string, any>, t: PageTheme): string {
  const items: Array<{ question: string; answer: string }> = c.items || [
    { question: "How does it work?", answer: "Our platform uses AI to automate your workflow." },
    { question: "Is there a free trial?", answer: "Yes! Start with a 14-day free trial, no credit card required." },
    { question: "Can I cancel anytime?", answer: "Absolutely. Cancel anytime with no questions asked." },
  ];
  return `<div class="section">
  <h2 class="section-title">${esc(c.title || "Frequently Asked Questions")}</h2>
  <div style="max-width:800px;margin:40px auto;">
    ${items.map((item) => `<details style="margin-bottom:12px;border:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-radius:var(--radius);overflow:hidden;">
      <summary style="padding:18px 24px;cursor:pointer;font-weight:600;font-size:1.05rem;background:color-mix(in srgb,var(--text) 3%,transparent);">${esc(item.question)}</summary>
      <div style="padding:18px 24px;opacity:0.8;">${esc(item.answer)}</div>
    </details>`).join("\n")}
  </div>
</div>`;
}

function renderCTAForm(c: Record<string, any>, t: PageTheme, page: PremiumPageData): string {
  const fields = page.form_fields || [
    { name: "name", label: "Your Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
  ];
  const webhook = page.form_webhook_url || "https://webhooks.zatesystems.com/webhook/marketing/landing-page-submit";
  const successMsg = page.form_success_message || "Thank you! We will be in touch.";

  return `<div id="cta" class="section" style="text-align:center;">
  <h2 class="section-title">${esc(c.title || "Get Started Today")}</h2>
  ${c.subtitle ? `<p class="section-subtitle">${esc(c.subtitle)}</p>` : ""}
  <form id="premium-form" style="max-width:500px;margin:40px auto;text-align:left;" onsubmit="return handleFormSubmit(event)">
    ${fields.map((f: any) => `<div style="margin-bottom:16px;">
      <label style="display:block;margin-bottom:6px;font-weight:500;font-size:0.9rem;">${esc(f.label)}</label>
      <input type="${f.type || "text"}" name="${f.name}" placeholder="${esc(f.label)}" ${f.required ? "required" : ""}>
    </div>`).join("\n")}
    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px;">${esc(c.buttonText || "Submit")}</button>
  </form>
  <div id="form-success" style="display:none;padding:32px;background:color-mix(in srgb,var(--primary) 10%,transparent);border-radius:var(--radius);max-width:500px;margin:40px auto;">
    <p style="font-size:1.1rem;font-weight:600;">${esc(successMsg)}</p>
  </div>
</div>
<script>
function handleFormSubmit(e) {
  e.preventDefault();
  var form = e.target;
  var data = {};
  new FormData(form).forEach(function(v,k){data[k]=v});
  data.page_id = '${page.id || ""}';
  data.tenant_id = '${page.tenant_id || ""}';
  data.source = 'premium_page';
  data.slug = '${page.slug || ""}';
  fetch('${webhook}', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).catch(function(){});
  form.style.display = 'none';
  document.getElementById('form-success').style.display = 'block';
  return false;
}
</script>`;
}

function renderStats(c: Record<string, any>, t: PageTheme): string {
  const items: Array<{ value: string; label: string }> = c.stats || [
    { value: "500+", label: "Clients Served" },
    { value: "98%", label: "Satisfaction Rate" },
    { value: "24/7", label: "Support Available" },
    { value: "50M+", label: "Tasks Automated" },
  ];
  return `<div class="section" style="text-align:center;">
  ${c.title ? `<h2 class="section-title">${esc(c.title)}</h2>` : ""}
  <div class="grid-${items.length > 4 ? 4 : items.length}" style="margin-top:32px;">
    ${items.map((s) => `<div style="padding:24px;">
      <div style="font-size:clamp(2rem,4vw,3.5rem);font-weight:800;background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${esc(s.value)}</div>
      <p style="font-size:0.95rem;opacity:0.7;margin-top:8px;">${esc(s.label)}</p>
    </div>`).join("\n")}
  </div>
</div>`;
}

function renderGallery(c: Record<string, any>, t: PageTheme): string {
  const images: string[] = c.images || [];
  if (images.length === 0) {
    return `<div class="section"><h2 class="section-title">${esc(c.title || "Gallery")}</h2><p class="section-subtitle">Add images to showcase your work</p></div>`;
  }
  return `<div class="section">
  ${c.title ? `<h2 class="section-title">${esc(c.title)}</h2>` : ""}
  <div class="grid-${c.columns || 3}" style="margin-top:32px;">
    ${images.map((url) => `<div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:4/3;">
      <img src="${esc(url)}" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
    </div>`).join("\n")}
  </div>
</div>`;
}

// ============================================================
// SCROLL ANIMATION ENGINE
// ============================================================

function renderScrollEngine(frameUrls: string[], overlayOpacity: number): string {
  return `<script>
(function(){
  var canvas = document.getElementById('scroll-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var frameUrls = ${JSON.stringify(frameUrls)};
  var frames = new Array(frameUrls.length);
  var loaded = 0;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  frameUrls.forEach(function(url, i) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() { frames[i] = img; loaded++; if (loaded === frameUrls.length) drawFrame(0); };
    img.onerror = function() { loaded++; };
    img.src = url;
  });

  function drawFrame(idx) {
    var img = frames[idx];
    if (!img || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    var x = (canvas.width - img.width * scale) / 2;
    var y = (canvas.height - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }

  var lastFrame = -1;
  function onScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollMax <= 0) return;
    var progress = Math.min(Math.max(scrollTop / scrollMax, 0), 1);
    var idx = Math.min(Math.floor(progress * frames.length), frames.length - 1);
    if (idx !== lastFrame) { lastFrame = idx; requestAnimationFrame(function() { drawFrame(idx); }); }
  }

  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();
})();
</script>`;
}

// ============================================================
// ANALYTICS TRACKING
// ============================================================

function renderAnalytics(page: PremiumPageData): string {
  if (!page.id || !page.tenant_id) return "";
  const sbUrl = "https://fncfbywkemsxwuiowxxe.supabase.co";
  const sbAnon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2ZieXdrZW1zeHd1aW93eHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjgyNzUsImV4cCI6MjA4MjQ0NDI3NX0.wlccZnaj9Awd03LkDSaSlZFqIiSSOgOedX-aCsqeLek";

  return `<script>
(function(){
  var pid = '${page.id}';
  var tid = '${page.tenant_id}';
  var vid = localStorage.getItem('_pv') || (Math.random().toString(36).substring(2) + Date.now().toString(36));
  localStorage.setItem('_pv', vid);
  var sb = '${sbUrl}/rest/v1';
  var hdr = {'apikey':'${sbAnon}','Authorization':'Bearer ${sbAnon}','Content-Type':'application/json','Prefer':'return=minimal'};
  var maxDepth = 0;
  var startTime = Date.now();

  // Track view
  fetch(sb+'/page_analytics', {method:'POST', headers:hdr, body:JSON.stringify({tenant_id:tid,page_id:pid,event_type:'view',visitor_id:vid,referrer:document.referrer,user_agent:navigator.userAgent})}).catch(function(){});
  fetch(sb+'/rpc/increment_premium_page_views', {method:'POST', headers:hdr, body:JSON.stringify({page_id_input:pid})}).catch(function(){});

  // Track scroll
  window.addEventListener('scroll', function() {
    var d = Math.round((window.scrollY / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)) * 100);
    if (d > maxDepth) maxDepth = d;
  }, {passive:true});

  // Track exit
  window.addEventListener('beforeunload', function() {
    var t = Math.round((Date.now() - startTime) / 1000);
    navigator.sendBeacon(sb+'/page_analytics', JSON.stringify({tenant_id:tid,page_id:pid,event_type:'exit',visitor_id:vid,event_data:{scroll_depth:maxDepth,time_seconds:t}}));
  });
})();
</script>`;
}

// ============================================================
// HELPERS
// ============================================================

function esc(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
