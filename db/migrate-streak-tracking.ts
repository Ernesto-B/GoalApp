import { db } from ".";
import { goals } from "@shared/schema";
import { eq } from "drizzle-orm";

async function migrateStreakTracking() {
  try {
    console.log("Starting streak tracking migration...");

    // Get all goals in the database
    const allGoals = await db.query.goals.findMany();
    console.log(`Found ${allGoals.length} goals to update`);

    // Update each goal with initial streak values and lastUpdated field if they don't have them
    for (const goal of allGoals) {
      console.log(`Processing goal ID ${goal.id}: ${goal.title}`);

      // Check if the goal has the currentStreak and lastUpdated fields
      // If they are undefined, we need to update them
      if (goal.currentStreak === undefined || goal.lastUpdated === undefined) {
        console.log(`Updating streak data for goal ID ${goal.id}`);
        
        // Default values for streak data
        const currentStreak = goal.currentStreak || 0;
        const longestStreak = goal.longestStreak || 0;
        const lastUpdated = goal.lastUpdated || new Date();

        // Update the goal with streak information
        await db.update(goals)
          .set({
            currentStreak,
            longestStreak,
            lastUpdated
          })
          .where(eq(goals.id, goal.id));
        
        console.log(`Updated goal ID ${goal.id} with streak data`);
      } else {
        console.log(`Goal ID ${goal.id} already has streak data, skipping`);
      }
    }

    console.log("Streak tracking migration completed successfully");
  } catch (error) {
    console.error("Error during streak tracking migration:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
// For ES modules, we need a different approach than the CommonJS require.main === module
// We'll use a direct self-invocation pattern
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateStreakTracking()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export default migrateStreakTracking;