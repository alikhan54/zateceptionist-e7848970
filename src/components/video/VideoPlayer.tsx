import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Maximize, Minimize, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoScene {
  scene_number: number;
  description: string;
  dialogue: string;
  visual_notes?: string;
  duration_seconds: number;
  image_url: string | null;
  voice?: string;
  text_overlay?: string;
  image_source?: string;
}

interface VideoPlayerProps {
  scenes: VideoScene[];
  title: string;
  aspectRatio?: string;
  onClose?: () => void;
}

export default function VideoPlayer({ scenes, title, aspectRatio = '16:9', onClose }: VideoPlayerProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const scene = scenes[currentScene] || null;
  const totalScenes = scenes.length;
  const sceneDuration = (scene?.duration_seconds || 5) * 1000;

  // Preload images on mount
  useEffect(() => {
    scenes.forEach((s, i) => {
      if (s.image_url) {
        const img = new Image();
        img.onload = () => setImagesLoaded(prev => ({ ...prev, [i]: true }));
        img.onerror = () => setImagesLoaded(prev => ({ ...prev, [i]: false }));
        img.src = s.image_url;
      }
    });
  }, [scenes]);

  // TTS narration
  const speakText = useCallback((text: string) => {
    if (!ttsEnabled || !ttsSupported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')
    );
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, ttsSupported]);

  // Stop TTS
  const stopTTS = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
  }, [ttsSupported]);

  // Advance to next scene
  const goToScene = useCallback((index: number) => {
    stopTTS();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    const clamped = Math.max(0, Math.min(index, totalScenes - 1));
    setCurrentScene(clamped);
    setProgress(0);
    startTimeRef.current = 0;
  }, [totalScenes, stopTTS]);

  // Animation frame loop for progress
  useEffect(() => {
    if (!isPlaying || !scene) return;

    startTimeRef.current = performance.now();
    // Speak the dialogue when scene starts
    speakText(scene.dialogue || scene.description);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min((elapsed / sceneDuration) * 100, 100);
      setProgress(pct);

      if (elapsed >= sceneDuration) {
        // Auto-advance
        if (currentScene < totalScenes - 1) {
          goToScene(currentScene + 1);
          // Re-trigger playing via a new animation frame
          return;
        } else {
          // End of video
          setIsPlaying(false);
          setProgress(100);
          return;
        }
      }
      timerRef.current = requestAnimationFrame(animate);
    };

    timerRef.current = requestAnimationFrame(animate);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isPlaying, currentScene, scene, sceneDuration, totalScenes, goToScene, speakText]);

  // Restart playing after scene change if still playing
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now();
    }
  }, [currentScene, isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      stopTTS();
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleTTS = () => {
    if (ttsEnabled) stopTTS();
    setTtsEnabled(!ttsEnabled);
  };

  // Calculate overall progress
  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration_seconds || 5), 0);
  const elapsedScenes = scenes.slice(0, currentScene).reduce((sum, s) => sum + (s.duration_seconds || 5), 0);
  const overallProgress = ((elapsedScenes + (progress / 100) * (scene?.duration_seconds || 5)) / totalDuration) * 100;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTime = elapsedScenes + (progress / 100) * (scene?.duration_seconds || 5);

  if (!scenes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No scenes available. Generate a script first.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden select-none',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      )}
      style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : aspectRatio === '4:5' ? '4/5' : '16/9' }}
    >
      {/* Scene Image */}
      <div className="absolute inset-0">
        {scenes.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === currentScene ? 1 : 0, zIndex: i === currentScene ? 1 : 0 }}
          >
            {s.image_url ? (
              <img
                src={s.image_url}
                alt={`Scene ${i + 1}`}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <span className="text-gray-500 text-lg">Scene {i + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top overlay: title + text_overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white text-sm font-semibold truncate">{title}</h3>
            {scene?.text_overlay && (
              <p className="text-white/90 text-xs mt-1">{scene.text_overlay}</p>
            )}
          </div>
          {onClose && (
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom overlay: dialogue subtitle */}
      {scene?.dialogue && (
        <div className="absolute bottom-24 left-0 right-0 z-10 px-6">
          <div className="bg-black/70 rounded-lg px-4 py-2 max-w-2xl mx-auto">
            <p className="text-white text-sm text-center leading-relaxed">{scene.dialogue}</p>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-3 px-4">
        {/* Overall progress bar */}
        <div
          className="w-full h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width);
            // Find which scene this percentage corresponds to
            let accum = 0;
            for (let i = 0; i < scenes.length; i++) {
              const scenePct = (scenes[i].duration_seconds || 5) / totalDuration;
              if (accum + scenePct >= pct) {
                goToScene(i);
                break;
              }
              accum += scenePct;
            }
          }}
        >
          <div
            className="h-full bg-white rounded-full transition-all duration-100 group-hover:h-2.5 group-hover:-mt-0.5"
            style={{ width: `${overallProgress}%` }}
          />
          {/* Scene markers */}
          <div className="relative -mt-1.5">
            {scenes.map((_, i) => {
              const markerPos = scenes.slice(0, i).reduce((sum, s) => sum + (s.duration_seconds || 5), 0) / totalDuration * 100;
              if (i === 0) return null;
              return (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-1.5 bg-white/40"
                  style={{ left: `${markerPos}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8"
              onClick={() => goToScene(currentScene - 1)} disabled={currentScene === 0}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-9 w-9"
              onClick={togglePlay}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8"
              onClick={() => goToScene(currentScene + 1)} disabled={currentScene === totalScenes - 1}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-white text-xs">
            <span className="font-mono">{formatTime(currentTime)}</span>
            <span className="text-white/50">/</span>
            <span className="font-mono text-white/70">{formatTime(totalDuration)}</span>
            <Badge variant="outline" className="text-white/80 border-white/30 text-[10px] ml-1">
              {currentScene + 1}/{totalScenes}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {ttsSupported && (
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8"
                onClick={toggleTTS} title={ttsEnabled ? 'Mute narration' : 'Enable narration'}>
                {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8"
              onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Scene dots (quick navigation) */}
      <div className="absolute bottom-20 left-0 right-0 z-10 flex justify-center gap-1.5">
        {scenes.map((_, i) => (
          <button
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              i === currentScene ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
            )}
            onClick={() => goToScene(i)}
          />
        ))}
      </div>
    </div>
  );
}
