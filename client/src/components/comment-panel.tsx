import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { InlineComment, User } from "@shared/schema";

interface CommentPanelProps {
  comments: (InlineComment & { author: User })[];
  onAddComment?: (text: string, filePath: string, range: any) => void;
  onResolveComment?: (commentId: string) => void;
  onUnresolveComment?: (commentId: string) => void;
}

export function CommentPanel({
  comments,
  onAddComment,
  onResolveComment,
  onUnresolveComment,
}: CommentPanelProps) {
  const [newCommentText, setNewCommentText] = useState("");

  const handleSubmitComment = () => {
    if (newCommentText.trim() && onAddComment) {
      onAddComment(
        newCommentText,
        "main.ts",
        { start: { line: 1, col: 0 }, end: { line: 1, col: 0 } }
      );
      setNewCommentText("");
    }
  };

  const openComments = comments.filter((c) => c.status === "open");
  const resolvedComments = comments.filter((c) => c.status === "resolved");

  if (!comments || comments.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Comments
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add inline comments to discuss code
          </p>
        </div>
        <div className="p-3 border-t">
          <Textarea
            placeholder="Add a comment..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="mb-2 resize-none"
            rows={3}
            data-testid="input-new-comment"
          />
          <Button
            onClick={handleSubmitComment}
            disabled={!newCommentText.trim()}
            className="w-full"
            data-testid="button-post-comment"
          >
            Post Comment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Comments
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {openComments.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Open ({openComments.length})
              </h4>
              <div className="space-y-3">
                {openComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-md border bg-card"
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.author.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {comment.author.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{comment.author.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-2 whitespace-pre-wrap">{comment.text}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {comment.filePath}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-7 text-xs gap-1"
                        onClick={() => onResolveComment?.(comment.id)}
                        data-testid={`button-resolve-${comment.id}`}
                      >
                        <Check className="h-3 w-3" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolvedComments.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Resolved ({resolvedComments.length})
              </h4>
              <div className="space-y-3">
                {resolvedComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-md border bg-muted/50"
                    data-testid={`comment-resolved-${comment.id}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Avatar className="h-6 w-6 opacity-60">
                        <AvatarImage src={comment.author.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {comment.author.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium opacity-60">{comment.author.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    </div>
                    <p className="text-sm opacity-60 mb-2 line-clamp-2">{comment.text}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => onUnresolveComment?.(comment.id)}
                      data-testid={`button-unresolve-${comment.id}`}
                    >
                      <X className="h-3 w-3" />
                      Unresolve
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <Textarea
          placeholder="Add a comment..."
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          className="mb-2 resize-none"
          rows={3}
          data-testid="input-new-comment"
        />
        <Button
          onClick={handleSubmitComment}
          disabled={!newCommentText.trim()}
          className="w-full"
          data-testid="button-post-comment"
        >
          Post Comment
        </Button>
      </div>
    </div>
  );
}
