import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Session,
  type InsertSession,
  type Snapshot,
  type InsertSnapshot,
  type File,
  type InsertFile,
  type InlineComment,
  type InsertInlineComment,
  type SessionParticipant,
  type InsertSessionParticipant,
  users,
  projects,
  sessions,
  snapshots,
  files,
  inlineComments,
  sessionParticipants,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOwnerId(ownerId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  
  getSession(id: string): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  getSessionsByHostId(hostId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSessionStatus(id: string, status: string): Promise<void>;
  
  getSnapshotsBySessionId(sessionId: string): Promise<Snapshot[]>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  
  getFilesByProjectId(projectId: string): Promise<File[]>;
  getFile(id: string): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFileContent(id: string, content: string): Promise<void>;
  
  getCommentsBySessionId(sessionId: string): Promise<InlineComment[]>;
  createComment(comment: InsertInlineComment): Promise<InlineComment>;
  updateCommentStatus(id: string, status: string): Promise<void>;
  
  getParticipantsBySessionId(sessionId: string): Promise<SessionParticipant[]>;
  addParticipant(participant: InsertSessionParticipant): Promise<SessionParticipant>;
  removeParticipant(sessionId: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByOwnerId(ownerId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.ownerId, ownerId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getAllSessions(): Promise<Session[]> {
    return db.select().from(sessions).orderBy(desc(sessions.createdAt));
  }

  async getSessionsByHostId(hostId: string): Promise<Session[]> {
    return db.select().from(sessions).where(eq(sessions.hostId, hostId)).orderBy(desc(sessions.createdAt));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSessionStatus(id: string, status: string): Promise<void> {
    await db.update(sessions).set({ status }).where(eq(sessions.id, id));
  }

  async getSnapshotsBySessionId(sessionId: string): Promise<Snapshot[]> {
    return db.select().from(snapshots).where(eq(snapshots.sessionId, sessionId)).orderBy(snapshots.timestamp);
  }

  async createSnapshot(insertSnapshot: InsertSnapshot): Promise<Snapshot> {
    const [snapshot] = await db.insert(snapshots).values(insertSnapshot).returning();
    return snapshot;
  }

  async getFilesByProjectId(projectId: string): Promise<File[]> {
    return db.select().from(files).where(eq(files.projectId, projectId));
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }

  async updateFileContent(id: string, content: string): Promise<void> {
    await db.update(files).set({ content, updatedAt: new Date() }).where(eq(files.id, id));
  }

  async getCommentsBySessionId(sessionId: string): Promise<InlineComment[]> {
    return db.select().from(inlineComments).where(eq(inlineComments.sessionId, sessionId)).orderBy(inlineComments.createdAt);
  }

  async createComment(insertComment: InsertInlineComment): Promise<InlineComment> {
    const [comment] = await db.insert(inlineComments).values(insertComment).returning();
    return comment;
  }

  async updateCommentStatus(id: string, status: string): Promise<void> {
    await db.update(inlineComments).set({ status, updatedAt: new Date() }).where(eq(inlineComments.id, id));
  }

  async getParticipantsBySessionId(sessionId: string): Promise<SessionParticipant[]> {
    return db.select().from(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId));
  }

  async addParticipant(insertParticipant: InsertSessionParticipant): Promise<SessionParticipant> {
    const [participant] = await db.insert(sessionParticipants).values(insertParticipant).returning();
    return participant;
  }

  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await db.update(sessionParticipants)
      .set({ leftAt: new Date() })
      .where(eq(sessionParticipants.sessionId, sessionId))
      .where(eq(sessionParticipants.userId, userId));
  }
}

export const storage = new DatabaseStorage();
