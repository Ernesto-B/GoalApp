import { db } from "./index";
import { pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

async function migrateAchievements() {
  try {
    console.log("Starting achievements and milestones migration...");
    
    // Create milestone type enum if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_type') THEN
          CREATE TYPE milestone_type AS ENUM (
            'streak', 
            'goal_completion', 
            'task_completion', 
            'consistency',
            'custom'
          );
        END IF;
      END
      $$;
    `);
    console.log("Created milestone_type enum if needed");
    
    // Create achievements table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type milestone_type NOT NULL,
        icon_name TEXT NOT NULL,
        badge_color TEXT NOT NULL,
        threshold_value INTEGER NOT NULL,
        current_value INTEGER NOT NULL DEFAULT 0,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Created achievements table if needed");
    
    // Seed predefined achievements
    await seedDefaultAchievements();
    
    console.log("Achievements migration completed successfully");
  } catch (error) {
    console.error("Error during achievements migration:", error);
  }
}

async function seedDefaultAchievements() {
  // Get all users
  const result = await db.query.users.findMany();
  
  for (const user of result) {
    // Check if user already has predefined achievements
    const existingAchievements = await db.execute(
      sql`SELECT COUNT(*) FROM achievements WHERE user_id = ${user.id}`
    );
    
    if (existingAchievements.rows[0].count > 0) {
      console.log(`User ${user.id} already has achievements, skipping...`);
      continue;
    }
    
    console.log(`Creating default achievements for user ${user.id}...`);
    
    // Default achievements to seed
    const defaultAchievements = [
      // Streak achievements
      {
        userId: user.id,
        title: "Consistency Champion",
        description: "Maintain a 3-day streak of completing tasks",
        type: "streak",
        iconName: "Flame",
        badgeColor: "#f97316", // Orange
        thresholdValue: 3,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Week Warrior",
        description: "Maintain a 7-day streak of completing tasks",
        type: "streak",
        iconName: "Zap",
        badgeColor: "#f59e0b", // Amber
        thresholdValue: 7,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Unstoppable Force",
        description: "Maintain a 30-day streak of completing tasks",
        type: "streak",
        iconName: "Award",
        badgeColor: "#d97706", // Yellow-600
        thresholdValue: 30,
        currentValue: 0
      },
      
      // Goal completion achievements
      {
        userId: user.id,
        title: "Goal Starter",
        description: "Complete your first goal",
        type: "goal_completion",
        iconName: "Flag",
        badgeColor: "#10b981", // Emerald
        thresholdValue: 1,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Goal Achiever",
        description: "Complete 5 goals",
        type: "goal_completion",
        iconName: "Trophy",
        badgeColor: "#059669", // Green
        thresholdValue: 5,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Ambition Master",
        description: "Complete 10 goals",
        type: "goal_completion",
        iconName: "Crown",
        badgeColor: "#047857", // Green-700
        thresholdValue: 10,
        currentValue: 0
      },
      
      // Task completion achievements
      {
        userId: user.id,
        title: "Task Tactician",
        description: "Complete 10 tasks",
        type: "task_completion",
        iconName: "CheckCircle",
        badgeColor: "#3b82f6", // Blue
        thresholdValue: 10,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Productivity Pro",
        description: "Complete 50 tasks",
        type: "task_completion",
        iconName: "Lightbulb",
        badgeColor: "#2563eb", // Blue-600
        thresholdValue: 50,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Task Terminator",
        description: "Complete 100 tasks",
        type: "task_completion",
        iconName: "Rocket",
        badgeColor: "#1d4ed8", // Blue-700
        thresholdValue: 100,
        currentValue: 0
      },
      
      // Consistency achievements
      {
        userId: user.id,
        title: "Early Riser",
        description: "Complete 10 morning tasks",
        type: "consistency",
        iconName: "Sunrise",
        badgeColor: "#8b5cf6", // Violet
        thresholdValue: 10,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Night Owl",
        description: "Complete 10 evening tasks",
        type: "consistency",
        iconName: "Moon",
        badgeColor: "#6d28d9", // Violet-700
        thresholdValue: 10,
        currentValue: 0
      },
      {
        userId: user.id,
        title: "Perfect Planner",
        description: "Complete 10 tasks on time",
        type: "consistency",
        iconName: "Clock",
        badgeColor: "#ec4899", // Pink
        thresholdValue: 10,
        currentValue: 0
      }
    ];
    
    // Insert default achievements
    for (const achievement of defaultAchievements) {
      await db.execute(
        sql`INSERT INTO achievements (
          user_id, title, description, type, icon_name, 
          badge_color, threshold_value, current_value
        ) VALUES (
          ${achievement.userId}, ${achievement.title}, ${achievement.description}, 
          ${achievement.type}::milestone_type, ${achievement.iconName}, 
          ${achievement.badgeColor}, ${achievement.thresholdValue}, ${achievement.currentValue}
        )`
      );
    }
    
    console.log(`Created ${defaultAchievements.length} default achievements for user ${user.id}`);
  }
}

migrateAchievements()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error running achievements migration:", error);
    process.exit(1);
  });