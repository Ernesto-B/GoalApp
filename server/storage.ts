import { db, pool } from "@db";
import { User, InsertUser, users, tasks, goals, userStats } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  createUser: (user: InsertUser) => Promise<User>;
  getUser: (id: number) => Promise<User | undefined>;
  getUserByUsername: (username: string) => Promise<User | undefined>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
    });
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    
    // Also create initial user stats record
    await db.insert(userStats).values({
      userId: user.id,
      longestStreak: 0,
      currentStreak: 0,
      goalsCompleted: 0,
      goalsShared: 0,
      tasksCompleted: 0,
      tenacityScore: 0,
      achieverScore: 0,
      motivatorScore: 0,
      consistencyScore: 0,
    });
    
    return user;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    return user;
  }
}

export const storage = new DatabaseStorage();
