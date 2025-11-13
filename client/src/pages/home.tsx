import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Calendar, Users, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDescription, setNewSessionDescription] = useState("");

  const { data: sessions, isLoading } = useQuery<(Session & { host: { username: string; avatarUrl: string | null }; _count: { participants: number } })[]>({
    queryKey: ["/api/sessions"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      return apiRequest("POST", "/api/sessions", {
        title: data.title,
        description: data.description,
        hostId: "fbc686e3-0305-49d5-a92a-462dca28e4fd",
        status: "scheduled",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session created",
        description: "Your session has been created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewSessionTitle("");
      setNewSessionDescription("");
      setLocation(`/session/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create session",
      });
    },
  });

  const handleCreateSession = () => {
    if (!newSessionTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please enter a session title",
      });
      return;
    }

    createSessionMutation.mutate({
      title: newSessionTitle,
      description: newSessionDescription || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return (
          <Badge variant="default" className="gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            LIVE
          </Badge>
        );
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "finished":
        return <Badge variant="outline">Finished</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Pairwise</h1>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-session" className="gap-2">
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-create-session">
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Start a new collaborative coding session
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    data-testid="input-session-title"
                    placeholder="E.g., Code Review: Authentication Module"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    data-testid="input-session-description"
                    placeholder="What will you work on in this session?"
                    value={newSessionDescription}
                    onChange={(e) => setNewSessionDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-session"
                  disabled={createSessionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateSession} 
                  data-testid="button-confirm-session"
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Your Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Manage your collaborative coding sessions
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="gap-2 space-y-0 pb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <Card key={session.id} className="hover-elevate" data-testid={`card-session-${session.id}`}>
                <CardHeader className="gap-2 space-y-0 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    {getStatusBadge(session.status)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {session.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.host.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {session.host.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{session.host.username}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{session._count.participants} participants</span>
                    </div>
                    {session.createdAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/session/${session.id}`}>
                    <Button
                      className="w-full gap-2"
                      variant={session.status === "live" ? "default" : "outline"}
                      data-testid={`button-join-session-${session.id}`}
                    >
                      {session.status === "live" ? (
                        <>
                          <Play className="h-4 w-4" />
                          Join Live Session
                        </>
                      ) : session.status === "finished" ? (
                        <>
                          <Calendar className="h-4 w-4" />
                          View Replay
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Start Session
                        </>
                      )}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first collaborative coding session
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-session">
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
