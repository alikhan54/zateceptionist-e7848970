import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVideoScripts } from "@/hooks/useVideoScripts";
import { Video, FileText, Loader2, AlertCircle } from "lucide-react";

interface Props {
  patientId: string;
}

// Patient-facing player for the doctor-avatar MEDICA video.
// Shows three states: rendering (waiting on n8n), ready (mp4 + transcript),
// or none (no script row yet — workflow not triggered).
export function DoctorAvatarVideoPlayer({ patientId }: Props) {
  const { latest, ready, isLoading } = useVideoScripts(patientId);
  const [showTranscript, setShowTranscript] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground" data-testid="video-player-loading">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading video…
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center" data-testid="video-player-empty">
        <Video className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No doctor-avatar video yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload a medical report — the AI analysis pipeline will generate a video explanation by Dr. AI.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center" data-testid="video-player-rendering">
        <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-3" />
        <p className="text-sm font-medium">Generating your video…</p>
        <p className="text-xs text-muted-foreground mt-1">
          MEDICA is preparing the script · MuseTalk is rendering the avatar · usually takes 30–90s
        </p>
        <Badge variant="outline" className="mt-3 text-xs">
          status: {latest.video_status ?? latest.status ?? "queued"}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="video-player-ready">
      <div className="rounded-lg overflow-hidden bg-black aspect-video">
        <video
          src={latest.video_url!}
          controls
          playsInline
          className="w-full h-full"
          data-testid="doctor-avatar-video"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {latest.estimated_duration_seconds ? `${latest.estimated_duration_seconds}s` : "—"} · Dr. AI explanation
        </span>
        <div className="flex items-center gap-2">
          {latest.approved_by && (
            <Badge variant="secondary" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" /> Reviewed
            </Badge>
          )}
          {latest.full_script && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowTranscript((s) => !s)}
              data-testid="toggle-transcript"
            >
              <FileText className="h-3 w-3 mr-1" /> {showTranscript ? "Hide" : "Show"} transcript
            </Button>
          )}
        </div>
      </div>
      {showTranscript && latest.full_script && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap" data-testid="transcript-text">
          {latest.full_script}
        </div>
      )}
    </div>
  );
}
