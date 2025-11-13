import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from "lucide-react";
import Editor from "@monaco-editor/react";
import type { Snapshot } from "@shared/schema";

interface SessionReplayProps {
  snapshots: Snapshot[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function SessionReplay({ snapshots, currentIndex, onIndexChange }: SessionReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (!isPlaying || currentIndex >= snapshots.length - 1) {
      setIsPlaying(false);
      return;
    }

    const interval = setInterval(() => {
      onIndexChange(currentIndex + 1);
    }, 2000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, snapshots.length, playbackSpeed, onIndexChange]);

  const handlePlayPause = () => {
    if (currentIndex >= snapshots.length - 1) {
      onIndexChange(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < snapshots.length - 1) {
      onIndexChange(currentIndex + 1);
      setIsPlaying(false);
    }
  };

  const handleSliderChange = (value: number[]) => {
    onIndexChange(value[0]);
    setIsPlaying(false);
  };

  const currentSnapshot = snapshots[currentIndex];
  const snapshotDiff = currentSnapshot?.diff as any;
  const fileContent = snapshotDiff?.files?.[0]?.content || "// No content";

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language="typescript"
          value={fileContent}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', 'Monaco', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="h-20 border-t bg-card px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              data-testid="button-replay-previous"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="default"
              onClick={handlePlayPause}
              data-testid="button-replay-play"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex >= snapshots.length - 1}
              data-testid="button-replay-next"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 px-3">
            <Slider
              value={[currentIndex]}
              onValueChange={handleSliderChange}
              max={snapshots.length - 1}
              step={1}
              className="cursor-pointer"
              data-testid="slider-replay"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground min-w-[80px]">
              {currentIndex + 1} / {snapshots.length}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={playbackSpeed === 0.5 ? "default" : "outline"}
                onClick={() => setPlaybackSpeed(0.5)}
                className="h-7 px-2 text-xs"
                data-testid="button-speed-0.5"
              >
                0.5x
              </Button>
              <Button
                size="sm"
                variant={playbackSpeed === 1 ? "default" : "outline"}
                onClick={() => setPlaybackSpeed(1)}
                className="h-7 px-2 text-xs"
                data-testid="button-speed-1"
              >
                1x
              </Button>
              <Button
                size="sm"
                variant={playbackSpeed === 2 ? "default" : "outline"}
                onClick={() => setPlaybackSpeed(2)}
                className="h-7 px-2 text-xs"
                data-testid="button-speed-2"
              >
                2x
              </Button>
            </div>
          </div>
        </div>

        {currentSnapshot && (
          <div className="text-xs text-muted-foreground truncate">
            {currentSnapshot.description || "Unnamed snapshot"}
          </div>
        )}
      </div>
    </div>
  );
}
