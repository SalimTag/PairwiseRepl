import { db } from "./db";
import { users, sessions, sessionParticipants } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const [testUser] = await db
    .insert(users)
    .values({
      username: "demo_user",
      password: "password123",
      displayName: "Demo User",
      email: "demo@pairwise.dev",
      avatarUrl: null,
      bio: "Collaborative coding enthusiast",
    })
    .onConflictDoNothing()
    .returning();

  console.log("Created test user:", testUser);

  const [session1] = await db
    .insert(sessions)
    .values({
      hostId: testUser.id,
      title: "Code Review: Authentication Module",
      description: "Reviewing the new OAuth2 implementation",
      status: "scheduled",
    })
    .onConflictDoNothing()
    .returning();

  const [session2] = await db
    .insert(sessions)
    .values({
      hostId: testUser.id,
      title: "Pair Programming: React Component Refactor",
      description: "Refactoring the dashboard components for better performance",
      status: "live",
    })
    .onConflictDoNothing()
    .returning();

  console.log("Created sessions:", [session1, session2]);

  if (session1) {
    await db.insert(sessionParticipants).values({
      sessionId: session1.id,
      userId: testUser.id,
      role: "host",
    });
  }

  if (session2) {
    await db.insert(sessionParticipants).values({
      sessionId: session2.id,
      userId: testUser.id,
      role: "host",
    });
  }

  console.log("Seed complete!");
}

seed().catch(console.error).then(() => process.exit(0));
