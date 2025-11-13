import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastSeen: timestamp("last_seen"),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  hostId: varchar("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("scheduled"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const snapshots = pgTable("snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  description: text("description"),
  diff: jsonb("diff").notNull(),
  baseSnapshotId: varchar("base_snapshot_id"),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const inlineComments = pgTable("inline_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  snapshotId: varchar("snapshot_id").notNull().references(() => snapshots.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  range: jsonb("range").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const sessionParticipants = pgTable("session_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("observer"),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
  leftAt: timestamp("left_at"),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  hostedSessions: many(sessions),
  snapshots: many(snapshots),
  comments: many(inlineComments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  files: many(files),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  host: one(users, {
    fields: [sessions.hostId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [sessions.projectId],
    references: [projects.id],
  }),
  snapshots: many(snapshots),
  comments: many(inlineComments),
  participants: many(sessionParticipants),
}));

export const snapshotsRelations = relations(snapshots, ({ one, many }) => ({
  session: one(sessions, {
    fields: [snapshots.sessionId],
    references: [sessions.id],
  }),
  author: one(users, {
    fields: [snapshots.authorId],
    references: [users.id],
  }),
  comments: many(inlineComments),
}));

export const filesRelations = relations(files, ({ one }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
}));

export const inlineCommentsRelations = relations(inlineComments, ({ one }) => ({
  session: one(sessions, {
    fields: [inlineComments.sessionId],
    references: [sessions.id],
  }),
  snapshot: one(snapshots, {
    fields: [inlineComments.snapshotId],
    references: [snapshots.id],
  }),
  author: one(users, {
    fields: [inlineComments.authorId],
    references: [users.id],
  }),
}));

export const sessionParticipantsRelations = relations(sessionParticipants, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionParticipants.sessionId],
    references: [sessions.id],
  }),
  user: one(users, {
    fields: [sessionParticipants.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
  timestamp: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInlineCommentSchema = createInsertSchema(inlineComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionParticipantSchema = createInsertSchema(sessionParticipants).omit({
  id: true,
  joinedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshots.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertInlineComment = z.infer<typeof insertInlineCommentSchema>;
export type InlineComment = typeof inlineComments.$inferSelect;
export type InsertSessionParticipant = z.infer<typeof insertSessionParticipantSchema>;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
