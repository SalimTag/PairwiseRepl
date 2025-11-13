import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SessionEditor } from "@/components/session-editor";
import { SnapshotTimeline } from "@/components/snapshot-timeline";
import { ParticipantList } from "@/components/participant-list";
import { CommentPanel } from "@/components/comment-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Users, Clock, Camera, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Session, Snapshot, InlineComment } from "@shared/schema";

export default function SessionPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const sessionId = params.id as string;
  const currentUserId = "fbc686e3-0305-49d5-a92a-462dca28e4fd";
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | undefined>();
  const [currentFileContent, setCurrentFileContent] = useState<Record<string, string>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery<Session & { host: { username: string; avatarUrl: string | null } }>({
    queryKey: ["/api/sessions", sessionId],
  });

  const { data: snapshots } = useQuery<(Snapshot & { author?: { username: string; avatarUrl: string | null }; _count?: { comments: number } })[]>({
    queryKey: ["/api/sessions", sessionId, "snapshots"],
  });

  const { data: comments } = useQuery<(InlineComment & { author: { username: string; email: string | null; avatarUrl: string | null } })[]>({
    queryKey: ["/api/sessions", sessionId, "comments"],
  });

  const { data: participants } = useQuery({
    queryKey: ["/api/sessions", sessionId, "participants"],
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host || `${window.location.hostname}:5000`;
    const wsUrl = `${protocol}//${host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join-session',
        sessionId,
        userId: currentUserId,
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'editor-change' && message.userId !== currentUserId) {
        setCurrentFileContent((prev) => ({
          ...prev,
          [message.filePath]: message.code,
        }));
      }
      
      if (message.type === 'participant-joined' || message.type === 'participant-left') {
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "participants"] });
      }
    };

    wsRef.current = socket;

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave-session' }));
      }
      socket.close();
    };
  }, [sessionId, currentUserId]);

  const createSnapshotMutation = useMutation({
    mutationFn: async (description: string) => {
      return apiRequest("POST", `/api/sessions/${sessionId}/snapshots`, {
        description,
        authorId: currentUserId,
        diff: {
          files: Object.entries(currentFileContent).map(([path, content]) => ({
            path,
            content,
          })),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "snapshots"] });
      toast({
        title: "Snapshot created",
        description: "Code state captured successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create snapshot",
      });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { text: string; filePath: string; range: any }) => {
      if (!currentSnapshotId) {
        throw new Error("No snapshot selected");
      }
      return apiRequest("POST", `/api/sessions/${sessionId}/comments`, {
        text: data.text,
        filePath: data.filePath,
        range: data.range,
        authorId: currentUserId,
        snapshotId: currentSnapshotId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "comments"] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
  });

  const updateCommentStatusMutation = useMutation({
    mutationFn: async ({ commentId, status }: { commentId: string; status: string }) => {
      return apiRequest("PATCH", `/api/comments/${commentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "comments"] });
    },
  });

  const handleCodeChange = (code: string, filePath: string) => {
    setCurrentFileContent((prev) => ({
      ...prev,
      [filePath]: code,
    }));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'editor-change',
        sessionId,
        code,
        filePath,
      }));
    }
  };

  useEffect(() => {
    if (snapshots && snapshots.length > 0 && !currentSnapshotId) {
      setCurrentSnapshotId(snapshots[snapshots.length - 1].id);
    }
  }, [snapshots, currentSnapshotId]);

  const handleTakeSnapshot = (description: string) => {
    createSnapshotMutation.mutate(description);
  };

  const handleAddComment = (text: string, filePath: string, range: any) => {
    createCommentMutation.mutate({ text, filePath, range });
  };

  const handleResolveComment = (commentId: string) => {
    updateCommentStatusMutation.mutate({ commentId, status: "resolved" });
  };

  const handleUnresolveComment = (commentId: string) => {
    updateCommentStatusMutation.mutate({ commentId, status: "open" });
  };

  const handleEndSession = () => {
    setLocation("/");
  };

  if (sessionLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-14 border-b bg-card px-4 flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex-1 flex">
          <Skeleton className="w-64 h-full" />
          <Skeleton className="flex-1 h-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Session not found</h2>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-sm font-medium">{session.title}</h1>
            <p className="text-xs text-muted-foreground">
              {session.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session.status === "live" && (
            <Badge variant="default" className="gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE
            </Badge>
          )}
          <ParticipantList participants={participants || []} variant="compact" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {isLeftSidebarOpen && (
          <div className="w-64 border-r bg-card flex flex-col shrink-0">
            <Tabs defaultValue="snapshots" className="flex-1 flex flex-col">
              <div className="border-b px-2 py-1">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="snapshots" className="text-xs gap-1" data-testid="tab-snapshots">
                    <Camera className="h-3 w-3" />
                    Snapshots
                  </TabsTrigger>
                  <TabsTrigger value="participants" className="text-xs gap-1" data-testid="tab-participants">
                    <Users className="h-3 w-3" />
                    People
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="snapshots" className="flex-1 overflow-hidden m-0">
                <SnapshotTimeline
                  snapshots={snapshots || []}
                  currentSnapshotId={currentSnapshotId}
                  onSelectSnapshot={setCurrentSnapshotId}
                />
              </TabsContent>
              <TabsContent value="participants" className="flex-1 overflow-hidden m-0">
                <ParticipantList participants={participants || []} variant="detailed" />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <SessionEditor
            sessionId={sessionId}
            onCodeChange={handleCodeChange}
            onTakeSnapshot={handleTakeSnapshot}
            onEndSession={handleEndSession}
            currentUserId={currentUserId}
          />
        </div>

        {isRightPanelOpen && (
          <div className="w-80 border-l bg-card flex flex-col shrink-0">
            <CommentPanel
              comments={comments || []}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
              onUnresolveComment={handleUnresolveComment}
            />
          </div>
        )}
      </div>
    </div>
  );
}
