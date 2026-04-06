import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Loader2,
  Copy,
  Sparkles,
  Clock,
  Type,
  Image as ImageIcon,
} from "lucide-react";
import {
  useYTChannels,
  useYTScripts,
  useTriggerScript,
  useTriggerAssetGen,
  type YTVideoScript,
} from "@/hooks/useYouTubeAgency";
import { useToast } from "@/hooks/use-toast";

const TONE_OPTIONS = [
  { value: "educational", label: "Educational" },
  { value: "entertaining", label: "Entertaining" },
  { value: "motivational", label: "Motivational" },
  { value: "controversial", label: "Controversial" },
];

const DURATION_OPTIONS = [
  { value: 60, label: "1 minute (Short)" },
  { value: 180, label: "3 minutes" },
  { value: 300, label: "5 minutes" },
  { value: 420, label: "7 minutes" },
  { value: 600, label: "10 minutes" },
  { value: 900, label: "15 minutes" },
];

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export default function ScriptWriter() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [tone, setTone] = useState<string>("educational");
  const [targetDuration, setTargetDuration] = useState<number>(300);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [showSeoPanel, setShowSeoPanel] = useState<boolean>(false);

  const { data: channels, isLoading: channelsLoading } = useYTChannels();
  const { data: scripts, isLoading: scriptsLoading } = useYTScripts();
  const triggerScript = useTriggerScript();
  const triggerAssetGen = useTriggerAssetGen();

  // Pre-fill topic from ?topic= query param (from Trends deep link)
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam && !topic) {
      setTopic(topicParam);
    }
  }, [searchParams, topic]);

  const selectedScript: YTVideoScript | undefined =
    scripts?.find((s) => s.id === selectedScriptId) ?? scripts?.[0];

  const handleGenerate = () => {
    if (!selectedChannelId || !topic.trim()) return;
    triggerScript.mutate({
      channel_id: selectedChannelId,
      topic: topic.trim(),
      tone,
      target_duration: targetDuration,
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const handleGenerateThumbnail = () => {
    if (!selectedScript?.suggested_thumbnail_prompt || !selectedScript.channel_id)
      return;
    triggerAssetGen.mutate({
      channel_id: selectedScript.channel_id,
      asset_types: ["thumbnail"],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Script Writer</h1>
        <p className="text-muted-foreground mt-1">
          Generate ready-to-record video scripts in seconds
        </p>
      </div>

      {/* Script Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            Script Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={selectedChannelId}
                onValueChange={setSelectedChannelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channelsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading channels...
                    </SelectItem>
                  ) : !channels || channels.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No channels available
                    </SelectItem>
                  ) : (
                    channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.channel_name || ch.handle || ch.channel_id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g. 5 productivity hacks for remote workers"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Duration</Label>
              <Select
                value={String(targetDuration)}
                onValueChange={(v) => setTargetDuration(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={
              !selectedChannelId || !topic.trim() || triggerScript.isPending
            }
            className="w-full md:w-auto"
          >
            {triggerScript.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Script
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Script */}
      {selectedScript && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {selectedScript.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {selectedScript.tone && (
                    <Badge variant="secondary">{selectedScript.tone}</Badge>
                  )}
                  {selectedScript.niche && (
                    <Badge variant="outline">{selectedScript.niche}</Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(selectedScript.target_duration_seconds)}
                  </Badge>
                  {selectedScript.actual_word_count && (
                    <Badge variant="outline" className="gap-1">
                      <Type className="h-3 w-3" />
                      {new Intl.NumberFormat().format(
                        selectedScript.actual_word_count,
                      )}{" "}
                      words
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hook */}
            {selectedScript.hook && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default">HOOK</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(selectedScript.hook!, "Hook")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedScript.hook}
                </p>
              </div>
            )}

            {/* Intro */}
            {selectedScript.intro && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">INTRO</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(selectedScript.intro!, "Intro")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedScript.intro}
                </p>
              </div>
            )}

            {/* Body Sections */}
            {selectedScript.body_sections &&
              selectedScript.body_sections.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-muted-foreground">
                    BODY SECTIONS
                  </div>
                  {selectedScript.body_sections.map((section, idx) => (
                    <details
                      key={idx}
                      className="p-4 rounded-lg border bg-card group"
                    >
                      <summary className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <span className="font-medium">
                            {section.heading}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatDuration(section.duration_seconds)}
                        </Badge>
                      </summary>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-end mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleCopy(section.content, section.heading);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              )}

            {/* Outro */}
            {selectedScript.outro && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">OUTRO</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(selectedScript.outro!, "Outro")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedScript.outro}
                </p>
              </div>
            )}

            {/* CTA */}
            {selectedScript.cta && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default">CALL TO ACTION</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(selectedScript.cta!, "CTA")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedScript.cta}
                </p>
              </div>
            )}

            {/* Footer stats */}
            <div className="flex flex-wrap gap-4 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Word Count:{" "}
                <span className="font-medium text-foreground">
                  {selectedScript.actual_word_count
                    ? new Intl.NumberFormat().format(
                        selectedScript.actual_word_count,
                      )
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Est. Duration:{" "}
                <span className="font-medium text-foreground">
                  {formatDuration(selectedScript.target_duration_seconds)}
                </span>
              </div>
            </div>

            {/* SEO Panel */}
            {(selectedScript.suggested_title ||
              selectedScript.suggested_description ||
              selectedScript.suggested_tags?.length > 0 ||
              selectedScript.suggested_thumbnail_prompt) && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSeoPanel(!showSeoPanel)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Suggested SEO & Metadata
                  </span>
                  <span>{showSeoPanel ? "Hide" : "Show"}</span>
                </Button>

                {showSeoPanel && (
                  <div className="mt-4 space-y-3">
                    {selectedScript.suggested_title && (
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Suggested Title
                        </div>
                        <div className="text-sm">
                          {selectedScript.suggested_title}
                        </div>
                      </div>
                    )}
                    {selectedScript.suggested_description && (
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Suggested Description
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {selectedScript.suggested_description}
                        </div>
                      </div>
                    )}
                    {selectedScript.suggested_tags &&
                      selectedScript.suggested_tags.length > 0 && (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Suggested Tags
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedScript.suggested_tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {selectedScript.suggested_thumbnail_prompt && (
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-muted-foreground">
                            Thumbnail Prompt
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateThumbnail}
                            disabled={triggerAssetGen.isPending}
                          >
                            {triggerAssetGen.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <ImageIcon className="h-3 w-3 mr-1" />
                            )}
                            Generate Thumbnail
                          </Button>
                        </div>
                        <div className="text-sm italic">
                          {selectedScript.suggested_thumbnail_prompt}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scripts Library */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scripts Library</CardTitle>
        </CardHeader>
        <CardContent>
          {scriptsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading scripts...
            </div>
          ) : !scripts || scripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scripts yet</p>
              <p className="text-sm mt-1">
                Generate your first AI script above
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {scripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                    (selectedScriptId || scripts[0]?.id) === script.id
                      ? "border-primary bg-muted/30"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{script.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(script.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      {script.tone && (
                        <Badge variant="outline">{script.tone}</Badge>
                      )}
                      {script.status && (
                        <Badge variant="secondary">{script.status}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
