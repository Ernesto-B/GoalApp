import { db } from ".";
import { sql } from "drizzle-orm";

async function migrateRemoveStats() {
  try {
    console.log("Starting migration to remove character stats columns...");
    
    // Drop columns related to character stats
    await db.execute(sql`
      ALTER TABLE user_stats 
      DROP COLUMN IF EXISTS tenacity_score,
      DROP COLUMN IF EXISTS achiever_score,
      DROP COLUMN IF EXISTS motivator_score,
      DROP COLUMN IF EXISTS consistency_score,
      
      DROP COLUMN IF EXISTS tenacity_level,
      DROP COLUMN IF EXISTS achiever_level,
      DROP COLUMN IF EXISTS motivator_level,
      DROP COLUMN IF EXISTS consistency_level,
      
      DROP COLUMN IF EXISTS tenacity_current_level_xp,
      DROP COLUMN IF EXISTS achiever_current_level_xp,
      DROP COLUMN IF EXISTS motivator_current_level_xp,
      DROP COLUMN IF EXISTS consistency_current_level_xp,
      
      DROP COLUMN IF EXISTS tenacity_next_level_points,
      DROP COLUMN IF EXISTS achiever_next_level_points,
      DROP COLUMN IF EXISTS motivator_next_level_points,
      DROP COLUMN IF EXISTS consistency_next_level_points,
      
      DROP COLUMN IF EXISTS tenacity_daily_change,
      DROP COLUMN IF EXISTS achiever_daily_change,
      DROP COLUMN IF EXISTS motivator_daily_change,
      DROP COLUMN IF EXISTS consistency_daily_change,
      DROP COLUMN IF EXISTS daily_change_date,
      
      DROP COLUMN IF EXISTS milestones_reached
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrateRemoveStats()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });