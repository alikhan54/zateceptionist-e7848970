import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2 } from "lucide-react";

interface LeadMagnet {
  id: string;
  tenant_id: string;
  title: string;
  hero_headline?: string;
  hero_subheadline?: string;
  page_content?: string;
  cta_button_text?: string;
  thank_you_message?: string;
  form_fields: any[];
  slug?: string;
}

export default function LeadMagnetPage() {
  const { slug } = useParams<{ slug: string }>();
  const [magnet, setMagnet] = useState<LeadMagnet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [thankYouMsg, setThankYouMsg] = useState("");

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const { data, error } = await (supabase as any)
        .from("lead_magnets")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (data) {
        setMagnet(data);
        // Increment views
        await (supabase as any)
          .from("lead_magnets")
          .update({ views: (data.views || 0) + 1 })
          .eq("id", data.id);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnet || !formData.email) return;
    setSubmitting(true);

    try {
      const webhookUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL || "https://webhooks.zatesystems.com/webhook") + "/lead-magnet-submit";
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: magnet.tenant_id,
          magnet_slug: magnet.slug,
          form_data: formData,
        }),
      });
      const result = await response.json();
      setThankYouMsg(result.message || magnet.thank_you_message || "Thanks! We'll be in touch soon.");
      setSubmitted(true);
    } catch (err) {
      setThankYouMsg("Something went wrong. Please try again.");
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  if (!magnet) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white"><p>Page not found</p></div>;

  const fields = Array.isArray(magnet.form_fields) ? magnet.form_fields : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {magnet.hero_headline || magnet.title}
        </h1>
        {magnet.hero_subheadline && (
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">{magnet.hero_subheadline}</p>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-20 grid md:grid-cols-5 gap-8">
        {/* Content */}
        <div className="md:col-span-3">
          {magnet.page_content && (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-slate-300 leading-relaxed">
              {magnet.page_content}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="md:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700 sticky top-8">
            <CardContent className="pt-6">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">You're in!</p>
                  <p className="text-slate-300">{thankYouMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {fields.map((field: any) => (
                    <div key={field.name}>
                      <label className="text-sm text-slate-300 mb-1 block">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      {field.type === "select" && field.options ? (
                        <Select
                          value={formData[field.name] || ""}
                          onValueChange={(v) => setFormData({ ...formData, [field.name]: v })}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-600">
                            <SelectValue placeholder={`Select ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type || "text"}
                          required={field.required}
                          placeholder={field.label}
                          className="bg-slate-900 border-slate-600"
                          value={formData[field.name] || ""}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                  <Button type="submit" className="w-full text-lg py-6" disabled={submitting}>
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    {magnet.cta_button_text || "Get Started"}
                  </Button>
                  <p className="text-xs text-slate-500 text-center">No spam. Unsubscribe anytime.</p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
