import { db } from ".";
import { sql } from "drizzle-orm";

async function migrateTimeOfDay() {
  console.log("Running migration to add longest_streak and time_of_day columns");
  
  try {
    // Add longest_streak column to goals table
    await db.execute(sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0 NOT NULL`);
    console.log("Added longest_streak column to goals table");
    
    // Add time_of_day column to tasks table
    await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_of_day TEXT DEFAULT 'not_set' NOT NULL`);
    console.log("Added time_of_day column to tasks table");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Execute the migration
migrateTimeOfDay();