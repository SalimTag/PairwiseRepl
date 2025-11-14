import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Button } from "@/components/ui/button";
import { Camera, Play, StopCircle, ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type FileNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
};

interface SessionEditorProps {
  sessionId: string;
  initialFiles?: FileNode[];
  onCodeChange?: (code: string, filePath: string) => void;
  onTakeSnapshot?: (description: string) => void;
  onEndSession?: () => void;
  currentUserId?: string;
  readOnly?: boolean;
}

export function SessionEditor({
  sessionId,
  initialFiles = [],
  onCodeChange,
  onTakeSnapshot,
  onEndSession,
  currentUserId,
  readOnly = false,
}: SessionEditorProps) {
  const defaultFiles: FileNode[] = [
    {
      name: "main.ts",
      path: "main.ts",
      type: "file",
      content: "// Start coding...\n\nfunction main() {\n  console.log('Hello, Pairwise!');\n}\n\nmain();\n",
    },
  ];
  
  const [files, setFiles] = useState<FileNode[]>(initialFiles.length > 0 ? initialFiles : defaultFiles);
  const [currentFile, setCurrentFile] = useState<FileNode | null>(files[0] || null);
  const [editorContent, setEditorContent] = useState<string>(files[0]?.content || "");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false);
  const [snapshotDescription, setSnapshotDescription] = useState("");
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
      
      if (currentFile) {
        setFiles(prev => prev.map(f => 
          f.path === currentFile.path ? { ...f, content: value } : f
        ));
        
        if (onCodeChange) {
          onCodeChange(value, currentFile.path);
        }
      }
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = currentFile?.path === node.path;

      if (node.type === "folder") {
        return (
          <div key={node.path}>
            <div
              className={`flex items-center gap-1 px-2 py-1 text-sm hover-elevate cursor-pointer rounded-md ${
                isSelected ? "bg-accent" : ""
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => toggleFolder(node.path)}
              data-testid={`folder-${node.path}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div>{renderFileTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          className={`flex items-center gap-1 px-2 py-1 text-sm hover-elevate cursor-pointer rounded-md ${
            isSelected ? "bg-accent" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 24}px` }}
          onClick={() => {
            setCurrentFile(node);
            setEditorContent(node.content || "");
          }}
          data-testid={`file-${node.path}`}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{node.name}</span>
        </div>
      );
    });
  };

  const handleTakeSnapshot = () => {
    setIsSnapshotDialogOpen(true);
  };

  const confirmSnapshot = () => {
    if (onTakeSnapshot) {
      onTakeSnapshot(snapshotDescription);
    }
    setSnapshotDescription("");
    setIsSnapshotDialogOpen(false);
  };

  const getLanguageFromPath = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      json: "json",
      html: "html",
      css: "css",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
      md: "markdown",
    };
    return langMap[ext || ""] || "typescript";
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-3 border-b">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Files
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">{renderFileTree(files)}</div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-2">
            {currentFile && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentFile.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTakeSnapshot}
                  data-testid="button-take-snapshot"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Take Snapshot</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="button-run-code"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Run Code</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              variant="destructive"
              onClick={onEndSession}
              data-testid="button-end-session"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              End Session
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-[#1e1e1e]">
          <Editor
            height="100%"
            language={currentFile ? getLanguageFromPath(currentFile.path) : "typescript"}
            value={editorContent}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Fira Code', 'Monaco', monospace",
              readOnly,
              lineNumbers: "on",
              renderWhitespace: "selection",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
            }}
          />
        </div>
      </div>

      <Dialog open={isSnapshotDialogOpen} onOpenChange={setIsSnapshotDialogOpen}>
        <DialogContent data-testid="dialog-snapshot">
          <DialogHeader>
            <DialogTitle>Take Snapshot</DialogTitle>
            <DialogDescription>
              Capture the current state of your code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="E.g., Added authentication logic"
              value={snapshotDescription}
              onChange={(e) => setSnapshotDescription(e.target.value)}
              data-testid="input-snapshot-description"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSnapshotDialogOpen(false)}
              data-testid="button-cancel-snapshot"
            >
              Cancel
            </Button>
            <Button onClick={confirmSnapshot} data-testid="button-confirm-snapshot">
              Take Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
