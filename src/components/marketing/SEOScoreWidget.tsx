import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, AlertCircle, Search, Loader2 } from "lucide-react";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { useTenant } from "@/contexts/TenantContext";

interface SEOScoreWidgetProps {
  contentType: string;
  contentId: string;
  compact?: boolean;
}

export function SEOScoreWidget({ contentType, contentId, compact = false }: SEOScoreWidgetProps) {
  const { tenantConfig } = useTenant();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<any>(null);

  const analyze = async () => {
    if (!tenantConfig?.id || !contentId) return;
    setLoading(true);
    try {
      const result = await callWebhook(WEBHOOKS.SEO_ANALYZE, {
        tenant_id: tenantConfig.id,
        content_type: contentType,
        content_id: contentId,
        keywords: keyword ? [keyword] : [],
      }, tenantConfig.id);
      setScore(result?.data || result);
    } catch {
      setScore(null);
    }
    setLoading(false);
  };

  const getScoreColor = (s: number) =>
    s >= 80 ? "text-green-500" : s >= 55 ? "text-yellow-500" : "text-red-500";

  const getScoreBg = (s: number) =>
    s >= 80 ? "bg-green-600" : s >= 55 ? "bg-yellow-600" : "bg-red-600";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Input placeholder="Target keyword..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="h-8 w-40 text-xs" />
        <Button size="sm" variant="outline" onClick={analyze} disabled={loading} className="h-8">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
        {score?.seo_score !== undefined && (
          <Badge className={getScoreBg(score.seo_score)}>SEO: {score.seo_score}/100</Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4" /> SEO Analysis
          </h4>
          {score?.seo_score !== undefined && (
            <span className={`text-2xl font-bold ${getScoreColor(score.seo_score)}`}>{score.seo_score}/100</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Enter target keyword..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="text-sm" />
          <Button onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
          </Button>
        </div>
        {score?.scores && (
          <div className="space-y-2">
            {[
              { label: "Keyword in Title", val: score.scores.title_score },
              { label: "Meta Description", val: score.scores.meta_description_score },
              { label: "Headings (H1/H2)", val: score.scores.heading_score },
              { label: "Keyword Density", val: score.scores.keyword_density_score },
              { label: "Readability", val: score.scores.readability_score },
              { label: "Content Length", val: score.scores.content_length_score },
              { label: "Internal Links", val: score.scores.internal_links_score },
            ].filter(i => i.val !== undefined).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {item.val >= 80 ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> :
                 item.val >= 50 ? <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" /> :
                 <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <span className="flex-1">{item.label}</span>
                <span className={`font-mono text-xs ${getScoreColor(item.val)}`}>{item.val}</span>
              </div>
            ))}
          </div>
        )}
        {score?.recommendations?.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">Recommendations:</p>
            {score.recommendations.slice(0, 5).map((rec: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs mr-1">{rec.priority}</Badge>
                {rec.fix || rec.issue}
              </p>
            ))}
          </div>
        )}
        {score?.word_count && <p className="text-xs text-muted-foreground">Word count: {score.word_count}</p>}
      </CardContent>
    </Card>
  );
}
