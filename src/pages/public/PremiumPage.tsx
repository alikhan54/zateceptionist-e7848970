import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generatePremiumHtml } from "@/lib/premiumPageHtmlGenerator";

const PremiumPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchPage = async () => {
      // Try by slug first, then by ID
      let query = supabase
        .from("premium_pages" as any)
        .select("*")
        .eq("status", "published");

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(slug);
      if (isUUID) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const page = data as any;

      // Parse sections if stored as string
      let sections = page.sections;
      if (typeof sections === "string") {
        try { sections = JSON.parse(sections); } catch { sections = []; }
      }

      // Generate HTML
      const pageHtml = generatePremiumHtml({
        ...page,
        sections: sections || [],
        theme: typeof page.theme === "string" ? JSON.parse(page.theme) : (page.theme || {}),
        scroll_frame_urls: page.scroll_frame_urls || [],
        scroll_config: typeof page.scroll_config === "string" ? JSON.parse(page.scroll_config) : (page.scroll_config || {}),
        form_fields: typeof page.form_fields === "string" ? JSON.parse(page.form_fields) : (page.form_fields || []),
      });

      setHtml(pageHtml);
      setLoading(false);

      // Set document title
      document.title = page.meta_title || page.name || "Page";
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "4rem", fontWeight: 800, opacity: 0.3 }}>404</h1>
          <p style={{ fontSize: "1.2rem", opacity: 0.6 }}>Page not found</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      style={{ width: "100%", height: "100vh", border: "none" }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      title="Premium Page"
    />
  );
};

export default PremiumPage;
