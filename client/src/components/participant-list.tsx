import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";
import type { User } from "@shared/schema";

interface Participant {
  id: string;
  user: User;
  role: string;
  isOnline?: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
  variant?: "compact" | "detailed";
}

export function ParticipantList({ participants, variant = "compact" }: ParticipantListProps) {
  if (!participants || participants.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No participants yet</p>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    const displayedParticipants = participants.slice(0, 5);
    const remainingCount = participants.length - displayedParticipants.length;

    return (
      <div className="flex items-center -space-x-2">
        {displayedParticipants.map((participant) => (
          <Tooltip key={participant.id}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={participant.user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {participant.user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {participant.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-medium">{participant.user.username}</p>
                <p className="text-muted-foreground capitalize">{participant.role}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs font-medium">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="flex items-center gap-2 p-2 rounded-md hover-elevate"
          data-testid={`participant-${participant.id}`}
        >
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={participant.user.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {participant.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {participant.isOnline && (
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-background rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{participant.user.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{participant.role}</p>
          </div>
          {participant.role === "host" && (
            <Badge variant="secondary" className="text-xs">Host</Badge>
          )}
        </div>
      ))}
    </div>
  );
}
