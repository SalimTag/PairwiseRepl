import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertSessionSchema, insertSnapshotSchema, insertInlineCommentSchema, insertFileSchema, insertProjectSchema } from "@shared/schema";
import { db } from "./db";
import { users, sessions, snapshots, inlineComments, sessionParticipants, files } from "@shared/schema";
import { eq, desc, count } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  app.get("/api/sessions", async (req, res) => {
    try {
      const allSessions = await db
        .select({
          id: sessions.id,
          projectId: sessions.projectId,
          hostId: sessions.hostId,
          title: sessions.title,
          description: sessions.description,
          status: sessions.status,
          startedAt: sessions.startedAt,
          endedAt: sessions.endedAt,
          createdAt: sessions.createdAt,
          host: {
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(sessions)
        .leftJoin(users, eq(sessions.hostId, users.id))
        .orderBy(desc(sessions.createdAt));

      const sessionsWithCounts = await Promise.all(
        allSessions.map(async (session) => {
          const [participantCount] = await db
            .select({ count: count() })
            .from(sessionParticipants)
            .where(eq(sessionParticipants.sessionId, session.id));

          return {
            ...session,
            _count: {
              participants: participantCount?.count || 0,
            },
          };
        })
      );

      res.json(sessionsWithCounts);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const [sessionData] = await db
        .select({
          id: sessions.id,
          projectId: sessions.projectId,
          hostId: sessions.hostId,
          title: sessions.title,
          description: sessions.description,
          status: sessions.status,
          startedAt: sessions.startedAt,
          endedAt: sessions.endedAt,
          createdAt: sessions.createdAt,
          host: {
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(sessions)
        .leftJoin(users, eq(sessions.hostId, users.id))
        .where(eq(sessions.id, sessionId));

      if (!sessionData) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(sessionData);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(400).json({ error: error.message || "Failed to create session" });
    }
  });

  app.patch("/api/sessions/:id/status", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { status } = req.body;
      
      if (!["scheduled", "live", "finished", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      await storage.updateSessionStatus(sessionId, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating session status:", error);
      res.status(500).json({ error: "Failed to update session status" });
    }
  });

  app.get("/api/sessions/:id/snapshots", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const snapshotsData = await db
        .select({
          id: snapshots.id,
          sessionId: snapshots.sessionId,
          authorId: snapshots.authorId,
          timestamp: snapshots.timestamp,
          description: snapshots.description,
          diff: snapshots.diff,
          baseSnapshotId: snapshots.baseSnapshotId,
          author: {
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(snapshots)
        .leftJoin(users, eq(snapshots.authorId, users.id))
        .where(eq(snapshots.sessionId, sessionId))
        .orderBy(snapshots.timestamp);

      const snapshotsWithCounts = await Promise.all(
        snapshotsData.map(async (snapshot) => {
          const [commentCount] = await db
            .select({ count: count() })
            .from(inlineComments)
            .where(eq(inlineComments.snapshotId, snapshot.id));

          return {
            ...snapshot,
            _count: {
              comments: commentCount?.count || 0,
            },
          };
        })
      );

      res.json(snapshotsWithCounts);
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  app.post("/api/sessions/:id/snapshots", async (req, res) => {
    try {
      const sessionId = req.params.id;
      
      // Extract files from request body
      const filesData = req.body.diff?.files || {};
      
      // Get most recent snapshot for diff calculation
      const previousSnapshots = await db
        .select()
        .from(snapshots)
        .where(eq(snapshots.sessionId, sessionId))
        .orderBy(desc(snapshots.timestamp))
        .limit(1);
      
      const filesModified = Object.keys(filesData);
      let linesChanged = 0;
      
      if (previousSnapshots.length > 0) {
        // Calculate diff against previous snapshot
        const prevDiff = previousSnapshots[0].diff as any;
        const prevFiles = prevDiff?.files || {};
        
        // Compare current files with previous snapshot
        for (const [path, content] of Object.entries(filesData)) {
          const currentLines = (content as string).split('\n').length;
          const prevContent = prevFiles[path] || '';
          const prevLines = typeof prevContent === 'string' ? prevContent.split('\n').length : 0;
          linesChanged += Math.abs(currentLines - prevLines);
        }
        
        // Add lines from files that were removed
        for (const [path, content] of Object.entries(prevFiles)) {
          if (!filesData[path]) {
            const prevLines = typeof content === 'string' ? (content as string).split('\n').length : 0;
            linesChanged += prevLines;
          }
        }
      } else {
        // First snapshot: all lines are "added"
        linesChanged = Object.values(filesData).reduce((sum: number, content: any) => {
          return sum + (typeof content === 'string' ? content.split('\n').length : 0);
        }, 0);
      }
      
      const metadata = {
        linesChanged, // Diff delta against previous snapshot (or total if first)
        filesModified,
      };
      
      // Normalize snapshot format
      const normalizedDiff = {
        files: filesData,
        metadata,
      };
      
      const validatedData = insertSnapshotSchema.parse({
        description: req.body.description,
        authorId: req.body.authorId,
        sessionId,
        diff: normalizedDiff,
      });
      
      const snapshot = await storage.createSnapshot(validatedData);
      
      // Broadcast snapshot-created event via WebSocket
      if (activeConnections.has(sessionId)) {
        broadcast(sessionId, {
          type: 'snapshot-created',
          snapshotId: snapshot.id,
          sessionId,
          timestamp: snapshot.timestamp,
          author: req.body.authorId,
          description: snapshot.description,
          metadata,
        });
      }
      
      res.status(201).json(snapshot);
    } catch (error: any) {
      console.error("Error creating snapshot:", error);
      res.status(400).json({ error: error.message || "Failed to create snapshot" });
    }
  });

  app.get("/api/snapshots/:id", async (req, res) => {
    try {
      const snapshotId = req.params.id;
      const [snapshot] = await db
        .select()
        .from(snapshots)
        .where(eq(snapshots.id, snapshotId));
      
      if (!snapshot) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      
      res.json(snapshot);
    } catch (error) {
      console.error("Error fetching snapshot:", error);
      res.status(500).json({ error: "Failed to fetch snapshot" });
    }
  });

  app.get("/api/sessions/:id/comments", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const commentsData = await db
        .select({
          id: inlineComments.id,
          sessionId: inlineComments.sessionId,
          snapshotId: inlineComments.snapshotId,
          filePath: inlineComments.filePath,
          range: inlineComments.range,
          authorId: inlineComments.authorId,
          text: inlineComments.text,
          status: inlineComments.status,
          createdAt: inlineComments.createdAt,
          updatedAt: inlineComments.updatedAt,
          author: {
            id: users.id,
            username: users.username,
            email: users.email,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(inlineComments)
        .leftJoin(users, eq(inlineComments.authorId, users.id))
        .where(eq(inlineComments.sessionId, sessionId))
        .orderBy(inlineComments.createdAt);

      res.json(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/sessions/:id/comments", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const validatedData = insertInlineCommentSchema.parse({
        ...req.body,
        sessionId,
      });
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      res.status(400).json({ error: error.message || "Failed to create comment" });
    }
  });

  app.patch("/api/comments/:id/status", async (req, res) => {
    try {
      const commentId = req.params.id;
      const { status } = req.body;
      
      if (!["open", "resolved", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      await storage.updateCommentStatus(commentId, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating comment status:", error);
      res.status(500).json({ error: "Failed to update comment status" });
    }
  });

  app.get("/api/sessions/:id/participants", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const participantsData = await db
        .select({
          id: sessionParticipants.id,
          sessionId: sessionParticipants.sessionId,
          userId: sessionParticipants.userId,
          role: sessionParticipants.role,
          joinedAt: sessionParticipants.joinedAt,
          leftAt: sessionParticipants.leftAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            email: users.email,
            avatarUrl: users.avatarUrl,
            bio: users.bio,
            createdAt: users.createdAt,
            lastSeen: users.lastSeen,
          },
        })
        .from(sessionParticipants)
        .leftJoin(users, eq(sessionParticipants.userId, users.id))
        .where(eq(sessionParticipants.sessionId, sessionId));

      const participants = participantsData.map((p) => ({
        id: p.id,
        role: p.role,
        user: p.user!,
        isOnline: p.leftAt === null,
      }));

      res.json(participants);
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  app.get("/api/projects/:id/files", async (req, res) => {
    try {
      const projectId = req.params.id;
      const files = await storage.getFilesByProjectId(projectId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post("/api/projects/:projectId/files", async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const validatedData = insertFileSchema.parse({
        ...req.body,
        projectId,
      });
      const file = await storage.createFile(validatedData);
      res.status(201).json(file);
    } catch (error: any) {
      console.error("Error creating file:", error);
      res.status(400).json({ error: error.message || "Failed to create file" });
    }
  });

  app.patch("/api/files/:id", async (req, res) => {
    try {
      const fileId = req.params.id;
      const { content } = req.body;
      
      if (content === undefined) {
        return res.status(400).json({ error: "Content is required" });
      }

      await storage.updateFileContent(fileId, content);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const fileId = req.params.id;
      await db.delete(files).where(eq(files.id, fileId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const activeConnections = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket) => {
    let currentSessionId: string | null = null;
    let userId: string | null = null;

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'join-session':
            currentSessionId = message.sessionId;
            userId = message.userId || 'anonymous';
            
            if (currentSessionId && !activeConnections.has(currentSessionId)) {
              activeConnections.set(currentSessionId, new Set());
            }
            if (currentSessionId) {
              activeConnections.get(currentSessionId)!.add(ws);
              
              broadcast(currentSessionId, {
                type: 'participant-joined',
                userId,
                timestamp: Date.now(),
              }, ws);
            }
            break;

          case 'editor-change':
            if (currentSessionId) {
              broadcast(currentSessionId, {
                type: 'editor-change',
                userId,
                code: message.code,
                filePath: message.filePath,
                timestamp: Date.now(),
              }, ws);
            }
            break;

          case 'cursor-move':
            if (currentSessionId) {
              broadcast(currentSessionId, {
                type: 'cursor-move',
                userId,
                position: message.position,
                filePath: message.filePath,
                timestamp: Date.now(),
              }, ws);
            }
            break;

          case 'leave-session':
            if (currentSessionId) {
              broadcast(currentSessionId, {
                type: 'participant-left',
                userId,
                timestamp: Date.now(),
              }, ws);
              
              const connections = activeConnections.get(currentSessionId);
              if (connections) {
                connections.delete(ws);
                if (connections.size === 0) {
                  activeConnections.delete(currentSessionId);
                }
              }
            }
            currentSessionId = null;
            userId = null;
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (currentSessionId && userId) {
        const connections = activeConnections.get(currentSessionId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            activeConnections.delete(currentSessionId);
          }
        }
        
        broadcast(currentSessionId, {
          type: 'participant-left',
          userId,
          timestamp: Date.now(),
        }, ws);
      }
    });
  });

  function broadcast(sessionId: string, message: any, exclude?: WebSocket) {
    const connections = activeConnections.get(sessionId);
    if (!connections) return;

    const messageStr = JSON.stringify(message);
    connections.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  return httpServer;
}
