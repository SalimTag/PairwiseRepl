import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SessionEditor } from "@/components/session-editor";
import { SnapshotTimeline } from "@/components/snapshot-timeline";
import { ParticipantList } from "@/components/participant-list";
import { CommentPanel } from "@/components/comment-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Users, Clock, Camera, MessageSquare, RotateCcw } from "lucide-react";
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
  const [isViewingSnapshot, setIsViewingSnapshot] = useState(false);
  const [snapshotFiles, setSnapshotFiles] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const { data: session, isLoading: sessionLoading } = useQuery<Session & { host: { username: string; avatarUrl: string | null } }>({
    queryKey: ["/api/sessions", sessionId],
  });

  const { data: files } = useQuery<any[]>({
    queryKey: ["/api/projects", session?.projectId, "files"],
    enabled: !!session?.projectId,
  });

  const { data: snapshots } = useQuery<(Snapshot & { author?: { username: string; avatarUrl: string | null }; _count?: { comments: number } })[]>({
    queryKey: ["/api/sessions", sessionId, "snapshots"],
  });

  const { data: comments } = useQuery<(InlineComment & { author: { username: string; email: string | null; avatarUrl: string | null } })[]>({
    queryKey: ["/api/sessions", sessionId, "comments"],
  });

  const { data: participants } = useQuery<any[]>({
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
      
      if (message.type === 'snapshot-created') {
        // Refresh snapshot list when new snapshot is created
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "snapshots"] });
        
        // Show toast notification if created by another user
        if (message.author !== currentUserId) {
          toast({
            title: "New snapshot",
            description: message.description || "A collaborator created a snapshot",
          });
        }
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
      const filesObject: Record<string, string> = {};
      Object.entries(currentFileContent).forEach(([path, content]) => {
        filesObject[path] = content;
      });
      
      return apiRequest("POST", `/api/sessions/${sessionId}/snapshots`, {
        description,
        authorId: currentUserId,
        diff: {
          files: filesObject,
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

  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: string; content: string }) => {
      return apiRequest("PATCH", `/api/files/${fileId}`, { content });
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

    const file = files?.find((f: any) => f.path === filePath);
    if (file) {
      if (saveTimerRef.current[filePath]) {
        clearTimeout(saveTimerRef.current[filePath]);
      }
      
      saveTimerRef.current[filePath] = setTimeout(() => {
        updateFileMutation.mutate({ fileId: file.id, content: code });
      }, 1500);
    }
  };

  useEffect(() => {
    if (snapshots && snapshots.length > 0 && !currentSnapshotId) {
      setCurrentSnapshotId(snapshots[snapshots.length - 1].id);
    }
  }, [snapshots, currentSnapshotId]);

  useEffect(() => {
    return () => {
      Object.values(saveTimerRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

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

  const handleRestoreSnapshot = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/snapshots/${snapshotId}`);
      
      if (!response.ok) {
        console.error('Snapshot fetch failed:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const snapshot = await response.json();
      console.log('Snapshot data:', snapshot);
      
      const diffData = snapshot.diff as any;
      let filesFromSnapshot: any[] = [];
      
      // Handle both new format (Record) and legacy format (Array)
      if (diffData?.files) {
        if (Array.isArray(diffData.files)) {
          // Legacy format: array of {path, content}
          filesFromSnapshot = diffData.files.map((file: any) => ({
            name: file.path.split('/').pop() || file.path,
            path: file.path,
            type: 'file',
            content: file.content,
          }));
        } else if (typeof diffData.files === 'object') {
          // New format: Record<string, string>
          filesFromSnapshot = Object.entries(diffData.files).map(([path, content]) => ({
            name: path.split('/').pop() || path,
            path,
            type: 'file',
            content: content as string,
          }));
        }
      }
      
      if (filesFromSnapshot.length === 0) {
        console.error('No files in snapshot diff:', diffData);
        throw new Error('Snapshot has no files');
      }
      
      console.log('Restored files:', filesFromSnapshot);
      
      setSnapshotFiles(filesFromSnapshot);
      setIsViewingSnapshot(true);
      setCurrentSnapshotId(snapshotId);
      
      toast({
        title: "Snapshot loaded",
        description: `Viewing snapshot from ${new Date(snapshot.timestamp).toLocaleString()}`,
      });
    } catch (error) {
      console.error('Restore snapshot error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load snapshot",
      });
    }
  };

  const handleBackToLive = async () => {
    try {
      // Exit snapshot view mode
      setIsViewingSnapshot(false);
      setSnapshotFiles([]);
      setCurrentSnapshotId(undefined);
      
      // Refetch latest files from database to ensure state is current
      await queryClient.refetchQueries({ 
        queryKey: ["/api/projects", session?.projectId, "files"] 
      });
      
      toast({
        title: "Back to live editing",
        description: "Editing mode restored with latest changes",
      });
    } catch (error) {
      console.error('Error returning to live mode:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reload live files",
      });
    }
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
                  onRestoreSnapshot={handleRestoreSnapshot}
                />
              </TabsContent>
              <TabsContent value="participants" className="flex-1 overflow-hidden m-0">
                <ParticipantList participants={participants || []} variant="detailed" />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {isViewingSnapshot && (
            <div className="bg-amber-500/20 border-b border-amber-500/50 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4" />
                <span className="font-medium">Viewing snapshot</span>
                <span className="text-muted-foreground">
                  - Read-only mode. Click "Back to Live" to resume editing.
                </span>
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={handleBackToLive}
                data-testid="button-back-to-live"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Back to Live
              </Button>
            </div>
          )}
          <SessionEditor
            sessionId={sessionId}
            initialFiles={isViewingSnapshot ? snapshotFiles : (files?.map((f: any) => ({
              name: f.name,
              path: f.path,
              type: f.type || 'file',
              content: f.content || '',
            })) || [])}
            onCodeChange={isViewingSnapshot ? undefined : handleCodeChange}
            onTakeSnapshot={handleTakeSnapshot}
            onEndSession={handleEndSession}
            currentUserId={currentUserId}
            readOnly={isViewingSnapshot}
          />
        </div>

        {isRightPanelOpen && (
          <div className="w-80 border-l bg-card flex flex-col shrink-0">
            <CommentPanel
              comments={(comments as any) || []}
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
