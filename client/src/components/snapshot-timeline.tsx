import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Camera } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Snapshot } from "@shared/schema";

interface SnapshotTimelineProps {
  snapshots: (Snapshot & { author?: { username: string; avatarUrl: string | null }; _count?: { comments: number } })[];
  currentSnapshotId?: string;
  onSelectSnapshot?: (snapshotId: string) => void;
}

export function SnapshotTimeline({ snapshots, currentSnapshotId, onSelectSnapshot }: SnapshotTimelineProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Camera className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No snapshots yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Take your first snapshot to track code changes
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {snapshots.map((snapshot, index) => {
          const isSelected = snapshot.id === currentSnapshotId;
          const isFirst = index === 0;

          return (
            <div
              key={snapshot.id}
              className={`relative pl-6 pb-3 ${!isFirst ? "border-l-2 border-border" : ""}`}
              data-testid={`snapshot-${snapshot.id}`}
            >
              <div
                className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 ${
                  isSelected
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
              />
              
              <div
                className={`p-3 rounded-md cursor-pointer hover-elevate ${
                  isSelected ? "bg-accent" : ""
                }`}
                onClick={() => onSelectSnapshot?.(snapshot.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {snapshot.description || "Unnamed snapshot"}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="shrink-0">Current</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  {snapshot.author && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={snapshot.author.avatarUrl || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {snapshot.author.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{snapshot.author.username}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(snapshot.timestamp), { addSuffix: true })}</span>
                  </div>
                  {snapshot._count && snapshot._count.comments > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{snapshot._count.comments}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
