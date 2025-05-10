import { db } from ".";
import { userStats } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateStats() {
  try {
    console.log("Starting migration for user_stats table...");
    
    // Alter table to add new columns
    await db.execute(sql`
      ALTER TABLE user_stats 
      ADD COLUMN IF NOT EXISTS milestones_reached INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS most_productive_day TEXT,
      ADD COLUMN IF NOT EXISTS most_productive_time TEXT,
      ADD COLUMN IF NOT EXISTS most_tasks_completed_in_day INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS most_tasks_completed_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS on_time_completion_rate INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS recurring_task_adherence INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS short_term_completion_rate INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS medium_term_completion_rate INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS long_term_completion_rate INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS longest_goal_age INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS longest_break_between_completions INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_tasks_per_day INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS tenacity_current_level_xp INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS achiever_current_level_xp INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS motivator_current_level_xp INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS consistency_current_level_xp INTEGER NOT NULL DEFAULT 0
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrateStats()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });