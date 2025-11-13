import { diffLines } from "diff";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Minus } from "lucide-react";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  fileName?: string;
}

export function DiffViewer({ oldContent, newContent, fileName }: DiffViewerProps) {
  const diff = diffLines(oldContent, newContent);
  
  let oldLineNumber = 1;
  let newLineNumber = 1;

  return (
    <div className="h-full flex flex-col bg-background">
      {fileName && (
        <div className="p-3 border-b flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName}</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Plus className="h-3 w-3 text-green-600" />
              {diff.filter((part) => part.added).reduce((acc, part) => acc + part.count, 0)}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Minus className="h-3 w-3 text-red-600" />
              {diff.filter((part) => part.removed).reduce((acc, part) => acc + part.count, 0)}
            </Badge>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          {diff.map((part, index) => {
            const lines = part.value.split("\n");
            if (lines[lines.length - 1] === "") {
              lines.pop();
            }

            return lines.map((line, lineIndex) => {
              const isAdded = part.added;
              const isRemoved = part.removed;
              const isUnchanged = !isAdded && !isRemoved;

              const oldNum = isAdded ? null : oldLineNumber;
              const newNum = isRemoved ? null : newLineNumber;

              if (!isAdded) oldLineNumber++;
              if (!isRemoved) newLineNumber++;

              return (
                <div
                  key={`${index}-${lineIndex}`}
                  className={`flex ${
                    isAdded
                      ? "bg-green-500/10"
                      : isRemoved
                      ? "bg-red-500/10"
                      : ""
                  }`}
                  data-testid={`diff-line-${index}-${lineIndex}`}
                >
                  <div className="flex shrink-0">
                    <div className="w-12 text-right px-2 text-muted-foreground select-none border-r">
                      {oldNum || ""}
                    </div>
                    <div className="w-12 text-right px-2 text-muted-foreground select-none border-r">
                      {newNum || ""}
                    </div>
                    <div className="w-6 flex items-center justify-center text-muted-foreground">
                      {isAdded && <Plus className="h-3 w-3 text-green-600" />}
                      {isRemoved && <Minus className="h-3 w-3 text-red-600" />}
                    </div>
                  </div>
                  <div className="flex-1 px-3 py-0.5 whitespace-pre-wrap break-all">
                    {line || " "}
                  </div>
                </div>
              );
            });
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
